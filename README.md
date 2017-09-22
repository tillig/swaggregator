# Swaggregator - Swagger Aggregation for an API Gateway

The Swaggregator is a Node.js module that packages up a Swagger UI used to aggregate the JSON from several different API endpoints and present it as a unified Swagger doc.

Originally written for use with [the PCF nginx API Gateway](https://github.com/tillig/pcf-nginx-gateway) though it could probably be easily used behind other gateways.

**It is intended to be run from behind a reverse proxy / API gateway.** If you run it locally you will see the Swagger docs but trying to submit an operation will not work because it assumes the redirection/proxying of the calls will be done by nginx rather than by the Swaggregator itself.

# Local Testing

```
npm install
npm start
```

Open a browser to `http://localhost:3000/swagger` and you should see the documentation. Watch the console log for errors.

The `dev\start.js` script is an example of what a deployed `index.js` should look like (see below).

# Deployed Application

You need four pieces for a PCF deployed version of the Swaggregator:

- `package.json` to reference the `swaggregator` app package. An example of this is in the `dev\sample-package.json` file.
- `index.js` to start the web server listening for Swagger requests. You can basically copy/paste `dev/index.js` but update the top `require` to be `require('swaggregator')`.
- `config\default.json` with your set of Swagger endpoints and security configuration. An example is in `config\default.json` and a description is below.
- `manifest.yml` defining the settings for pushing the app. An example is in `config\manifest.yml`.

## Configuration

Configuration should be in your `config\default.json` file. A sample can be seen in the `config\default.json` file. A skeleton looks like this:

```json
{
  "documents": [
    {
      "id": "uid",
      "swagger_url": "https://path/to/swagger.json",
      "path_rewrite": {
        "^/unwanted-prefix/": "",
        "(.*)/bad-noun/(.*)": "$1/good-noun/$2"
      }
    }
  ],
  "info": {
    "title": "My REST API",
    "version": "1.0"
  },
  "oauth": {
    "clientId": "swagger",
    "securityDefinition": {
      "authorizationUrl": "https://identityprovider/connect/authorize",
      "flow": "implicit",
      "scopes": {
        "api": "Full API Access"
      },
      "tokenUrl": "https://identityprovider/connect/token",
      "type": "oauth2"
    }
  }
}
```

### Microservices

Microservices are each defined in an element in the `documents` collection where:

- `id`: A unique, simple ID among all documents. This gets appended to all operation IDs and model IDs for the document to ensure naming clashes don't exist. This should be immutable. It will be seen in the Swagger UI prefixing model names. Try not to include special characters if possible.
- `swagger_url`: The full URL to the `swagger.json` file for the service.
- `path_rewrite`: An _optional_ set of search/replace regular expressions that will be run on the operation paths in the order listed. This can be used to ensure the Swagger docs match what the nginx gateway is expecting. Note the path provided is the path from the original Swagger doc and does not include the original base path value. If you don't need these, omit `path_rewrite` altogether.

**If multiple operation paths overlap, last one in wins.**

### Document Configuration

The `info` node stores top-level document information that will appear both in the UI and in the aggregate Swagger JSON.

### OAuth Configuration

The optional `oauth` node allows you to configure an OAuth provider that can be used to authenticate. It is assumed all REST services under the API gateway trust the identity provider, allow the same set of scopes, etc.

## Deploy to PCF

A sample `manifest.yml` is in the `config` folder. Create a manifest at the root of your application similar to this one. Once you've customized it, you can do:

`cf push swaggregator-app-name`

# References

- [Node.js Buildpack](http://docs.cloudfoundry.org/buildpacks/node/index.html)
- [PCF Tips for Node.js Applications](http://docs.cloudfoundry.org/buildpacks/node/node-tips.html)
- [`swagger-combined` Node.js Module](https://github.com/thanhson1085/swagger-combined/) - This is the code on which Swaggregator is based.

# License

Swaggregator code is licensed under the MIT License - do what you want. The `static` folder used to render UI is from the [swagger-ui project](https://github.com/swagger-api/swagger-ui) licensed under Apache 2.0.
