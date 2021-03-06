import * as retry from 'retry';
import { ExecOutputReturnValue } from 'shelljs';
import * as shelljs from 'shelljs';

import { PaperboyOptions } from './interfaces/paperboy-options.interface';
import { Source } from './interfaces/source.interface';
import { logger } from './logger';
import { Sink } from './sink';

export class Paperboy {
  private options: PaperboyOptions;
  private sink: Sink;
  private source: Source;

  constructor(options: PaperboyOptions) {
    this.options = options;
    this.sink = new Sink(this.options.sink);
  }

  public async fromSource(): Promise<void> {
    if (!this.source) {
      this.source = await this.loadSource();
    }

    return this.source.generate().catch((err: any) => {
      logger.error('Generation from source failed', err);
    });
  }

  public async toSink(): Promise<void | ExecOutputReturnValue> {
    const operation = retry.operation({forever: true});
    await operation.attempt(async () => {
      try {
        await this.sink.build();
      } catch (error) {
        logger.error(`Build process failed with exit code: ${error}`);

        if (operation.retry(error)) {
          logger.warn('Retrying build...');
          return;
        }
      }
    });
  }

  public async build(): Promise<void> {
    await this.fromSource();
    await this.toSink();
  }

  public async start(): Promise<void> {
    this.source = await this.loadSource();

    // initial generation
    await this.build();

    // Execute readiness hook if set
    if (this.options.readinessHook && 0 !== this.options.readinessHook.length) {
      shelljs.exec(this.options.readinessHook);
    }

    // notify source of completed initial build
    await this.source.start();
  }

  private async loadSource(): Promise<Source> {
    return this.options.source.sourceFactory.buildSource(
      this.options.source,
      this.toSink.bind(this)
    );
  }
}
