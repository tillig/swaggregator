# Swaggregator - Swagger Aggregation for an API Gateway

The Swaggregator is a simple Node.js Swagger aggregation service that grabs all the docs from a set of microservices hosted behind an API gateway and presents them as a unified document.

Originally written for use with [the PCF nginx API Gateway](https://github.com/tillig/pcf-nginx-gateway) though it could probably be easily used behind other gateways.

You can run it locally but actually calling services won't work through the Swagger docs because the Swaggregator itself isn't a proxy - it assumes the API gateway handles reverse proxy and routing operations.

## Local Testing

```
npm install
node .\index.js
```

Open a browser to `http://localhost:3000/swagger` and you should see the documentation. Watch the console log for errors.

## Deployment

`cf push swaggregator-app-name`

## References

- [Node.js Buildpack](http://docs.cloudfoundry.org/buildpacks/node/index.html)
- [PCF Tips for Node.js Applications](http://docs.cloudfoundry.org/buildpacks/node/node-tips.html)
- [`swagger-combined` Node.js Module](https://github.com/thanhson1085/swagger-combined/) - This is the code on which Swaggregator is based.

# Adding a New Microservice

Edit the `config\default.json` file to add a new entry to the `documents` list. Each document should look like this:

```json
{
  "id": "myapi",
  "swagger_url": "https://host/url/to/your/swagger.json",
  "path_rewrite": {
    "^/unwanted-prefix/": "",
    "(.*)/bad-noun/(.*)": "$1/good-noun/$2"
  }
}
```

Where:

- `id`: A unique, simple ID among all documents. This gets appended to all operation IDs and model IDs for the document to ensure naming clashes don't exist. _This should be immutable._ It will be seen in the Swagger UI prefixing model names. Try not to include special characters if possible.
- `swagger_url`: The full URL to the `swagger.json` file for the service.
- `path_rewrite`: An optional set of search/replace regular expressions that will be run on the operation paths in the order listed. This can be used to ensure the Swagger docs match what the API gateway is expecting. Note the path provided is the path from the original Swagger doc and does not include the original base path value. If you don't need these, omit `path_rewrite` altogether.

**If multiple operation paths overlap, last one in wins.**

# Swagger Metadata

The `default.json` has an `info` node that modifies the overall metadata for the Swagger JSON that is generated. The `title` element also is used as the title in the Swagger HTML view.

```json
"info": {
  "title": "My REST API",
  "version": "1.0"
}
```

# OAuth 2

The `default.json` has an `oauth` node that allows you to define OAuth support for your aggregate Swagger doc. Individual Swagger docs that contribute to the aggregate don't contribute security definitions - that's controlled at the top.

If you don't want `oauth` support, remove the `oauth` node from the `default.json`.

```json
"oauth": {
  "clientId": "my-client-id",
  "clientSecret": "my-client-secret",
  "realm": "my-oauth-realm",
  "appName": "Swagger UI",
  "securityDefinition": {
    "authorizationUrl": "https://my-identity-server/connect/authorize",
    "flow": "implicit",
    "scopes": {
      "api": "API Access"
    },
    "tokenUrl": "https://my-identity-server/connect/token",
    "type": "oauth2"
  }
}
```

`clientId`, `clientSecret`, and `realm` are used depending on the `flow` for OAuth you define. You may omit them if they're not required.

If `appName` is omitted it defaults to `Swagger UI`.

The `securityDefinition` is based on [the Swagger 2.0 `securityDefinitions` object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#securityDefinitionsObject). If present, this will be added as the only security definition entry and will have an ID `oauth2`.

# License

Swaggregator code is licensed under the MIT License - do what you want. The `static` folder used to render UI is from the [swagger-ui project](https://github.com/swagger-api/swagger-ui) licensed under Apache 2.0.
