![Paperboy](images/logo.png)

# Paperboy

A middleware written in TypeScript to connect different CMS with your delivery layer and to notify it of content changes.

## Overview

To leverage the flexibility of a content management system while having the performance of a static site one needs to decouple the delivery layer from the CMS. Paperboy acts as a broker between these two layers by informing the delivery layer of content changes. To support the use-case of multiple frontend servers Paperboy multiplexes events via a Queue. Using the [Magnolia CMS](https://www.magnolia-cms.com), the complete setup looks like the following:

![Architecture with Magnolia](images/magnolia-architecture.png)

1. This setup works by add a Magnolia module to both
   instances, which listens for content changes and publishes
   details of those changes to a Webhook which publishes a message in an AMQP compatible queue
2. A client-side library then subscribes to this queue
3. When a message is received, the library fetches the
   content via the delivery endpoint released with Magnolia 5.6, transforms the JSON data (e.g. to ease the use of
   assets)
4. Finally it will execute an arbitrary command to trigger
   the actual rebuild of the frontend

In case we don't want to operate the delivery tier ourselves and instead use a CDN like [Netlify](https://www.netlify.com) you can use the Magnolia Module to publish directly to a webhook by the CDN provider:

![Architecture](images/netlify-architecture.png)

### Components

For the content management tier we provide two submodules which together with a queue handle the propagation of content change events:

1. [Paperboy push service](./paperboy-push-service): A small HTTP service that can be used as a webhook.
2. [Paperboy Magnolia module](./paperboy-magolia-module): A module that integrates directly into Magnolia and sends HTTP messages to the push service whenever a change in a watched workspace occurs.

The subscriber part of this system is currently comprised of three submodules in this repository:

1. [Paperboy Core](./paperboy-core): The core library which handles all generic configuration and knows how to execute the commands to trigger rebuilds.
2. [Paperboy CLI](./paperboy-cli): A simple CLI to ease usage and setup
3. [Paperboy Magnolia Source](./paperboy-magnolia-source): A plug-in for the core which can fetch and transpose JSON data obtained from Magnolia.

## Quickstart

To quick start your project set-up, execute the stepts in [Frontend Set-Up](#frontend-set-up) and [Magnolia Set-Up](#magnolia-set-up). Afterward eitehr execute the steps from [Custom delivery layer](#custom-delivery-layer) or [Netlify](#netlify) depending on your setup.

### Frontend Set-Up

To use Paperboy in your Frontend you can simply install the CLI globally via:

```bash
$ npm i -g @neoskop/paperboy-cli
```

In case that you are writing the frontend with JavaScript you can also install the CLI locally in your project:

```
$ npm i --save-dev @neoskop/paperboy-cli
```

### Magnolia Set-Up

Generate a blank Magnolia project using Magnolia's archetype catalog:

```bash
$ mvn org.apache.maven.plugins:maven-archetype-plugin:2.4:generate -DarchetypeCatalog=https://nexus.magnolia-cms.com/content/groups/public/  \
-Dfilter=info.magnolia.maven.archetypes:magnolia-project-archetype
```

Afterwards add the Paperboy Magnolia Module to the webapp's POM.xml:

```xml
<dependency>
 <groupId>de.neoskop.magnolia</groupId>
 <artifactId>paperboy</artifactId>
 <version>1.0.0</version>
</dependency>
```

Build the WAR and deploy it in a servlet container.

### Custom delivery layer

In case of a custom deliver layer, start the push service and a RabbitMQ server by running the following command in the root folder of this repository:

```bash
$ docker-compose up
```

When the containers are up and running, import the following config into Magnolia's configuration under `/modules/paperboy/config`:

```yaml
webhookConfig: 
  authorization: BEARER_TOKEN
  bearerToken: eash9uk3eejak6ena7thi8DooMih5eax
  url: http://push-service:8080/
```

To configure the frontend, create a file called `paperboy.config.json` with the following contents:

```json
{
  "sourceOptions": {
    "name": "magnolia",
    "output": {
      "json": "src",
      "assets": "src/assets",
      "excludedProperties": [
        "jcr:created",
        "jcr:createdBy",
        "jcr:lastModifiedBy",
        "jcr:lastActivated",
        "jcr:lastActivatedBy",
        "jcr:activationStatus",
        "jcr:lastActivatedVersion",
        "jcr:lastActivatedVersionCreated",
        "jcr:primaryType",
        "mgnl:created",
        "mgnl:createdBy",
        "mgnl:lastModifiedBy",
        "mgnl:lastActivated",
        "mgnl:lastActivatedBy",
        "mgnl:activationStatus",
        "mgnl:lastActivatedVersion",
        "mgnl:lastActivatedVersionCreated",
        "mgnl:primaryType"
      ]
    },
    "magnolia": {
      "url": "http://localhost:8080",
      "damJsonEndpoint": "/.rest/delivery/dam/v1",
      "pagesEndpoint": "/.rest/delivery/website/v1",
      "sitemapEndpoint": "/sitemap",
      "auth": {
        "header": "Basic cGFwZXJib3k6d0xGYkxqTkN4QVg4dzR0RVFHdzQyRDZP"
      }
    },
    "queue": {
      "uri": "amqp://admin:Boo4bah3ohcohthaeHa5ohter0iSeeS0@localhost:5672",
      "exchangeName": "paperboy_preview"
    }
  },
  "sinkOptions": {
    "async": true,
    "command": "npm start",
    "restartOnChange": false,
    "workDir": "."
  }
}
```

Finally change to the frontend directory and run:

```bash
$ paperboy start
```

### Netlify

To configure the frontend, create a fiel called `paperboy.config.json` with the following contents:

```json
{
  "sourceOptions": {
    "name": "magnolia",
    "output": {
      "json": "src",
      "assets": "src/assets",
      "excludedProperties": [
        "jcr:created",
        "jcr:createdBy",
        "jcr:lastModifiedBy",
        "jcr:lastActivated",
        "jcr:lastActivatedBy",
        "jcr:activationStatus",
        "jcr:lastActivatedVersion",
        "jcr:lastActivatedVersionCreated",
        "jcr:primaryType",
        "mgnl:created",
        "mgnl:createdBy",
        "mgnl:lastModifiedBy",
        "mgnl:lastActivated",
        "mgnl:lastActivatedBy",
        "mgnl:activationStatus",
        "mgnl:lastActivatedVersion",
        "mgnl:lastActivatedVersionCreated",
        "mgnl:primaryType"
      ]
    },
    "magnolia": {
      "url": "http://localhost:8080",
      "damJsonEndpoint": "/.rest/delivery/dam/v1",
      "pagesEndpoint": "/.rest/delivery/website/v1",
      "sitemapEndpoint": "/sitemap",
      "auth": {
        "header": "Basic cGFwZXJib3k6d0xGYkxqTkN4QVg4dzR0RVFHdzQyRDZP"
      }
    }
  },
  "sinkOptions": {
    "async": false,
    "command": "npm run build",
    "restartOnChange": false,
    "workDir": "."
  }
}
```

To configure the netlify build create a file called `netlify.toml` with the following contents:

```toml
[Settings]
ID = "paperboy-netlify-demo"

[build]
  base = "/"
  publish = "dist/"

[context.develop]
  command = "paperboy build"

[context.master]
  command = "paperboy build"
```

This setup alone will only fetch the content from Magnolia whenever a change in the repository triggers a rebuild of the site on Netlify. 

To also trigger a rebuild of the frontend whenever a change in Magnolia's content occurs, create a webhook in Netlify under `Settings > Build & Deploy` in your project.

Click "Add build hook":

![Webhook Creation pt. 1](images/netlify-webhook-01.png)

Give the hook a meaningful name and press "Save":

![Webhook Creation pt. 2](images/netlify-webhook-02.png)

Copy the webhook's URL:

![Webhook Creation pt. 2](images/netlify-webhook-03.png)

Finally import the following config into Magnolia's configuration under `/modules/paperboy/config`:

```yaml
webhookConfig: 
  authorization: NONE
  url: https://api.netlify.com/build_hooks/<webhook-id>
```

## License

This project is under the terms of the Apache License, Version 2.0. A [copy of this license](LICENSE) is included with the sources.
