# Address Translation Layer

This repository contains a RESTful API built with Express.js for managing translations and identifiers for crypto wallet addresses. It provides endpoints for adding, updating, retrieving, and deleting data in the translation database.

## Getting Started

### Left To Do

- Add better error handling instead of just throwing 500 code
- Add a way to create project accounts and generate access keys
- Look for a way to add salt to identifier hash to improve resilience to rainbow table attacks without having to validate hash of each row in database 

### Prerequisites

- Node.js installed on your machine

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Ashintosh/address-translation-layer.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your database connection by configuring in an environment variable:
   ```
    POSTGRES_HOST=
    POSTGRES_POST=
    POSTGRES_USER=
    POSTGRES_DB=
    POSTGRES_PASSWORD=
   ```

4. Install npm modules:
   ```bash
   npm install
   ```

5. Start the server:
   ```bash
   npm run start
   ```

### Usage

Once the server is up and running, you can interact with the API using HTTP requests.

#### Authentication

Requests to the API require a valid project ID and access key provided in the request headers.

Access key should be provided using the HTTP Authentication header.

#### Endpoints

- **POST /translation**

  Adds an identifier and its associated address to the translation database.

  Request Body:
  ```http
  POST https://localhost:51058/api/translation
  Content-Type: application/json
  Authorization: api-key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  {
      "projectID": "your_project_id",
      "identifier": "your_identifier",
      "address": "your_address"
  }
  ```

- **GET /translation**

  Retrieves the address associated with a given identifier from the translation database.

  Request Body:
  ```http
  GET https://localhost:51058/api/translation
  Content-Type: application/json
  Authorization: api-key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  {
      "projectID": "your_project_id",
      "identifier": "your_identifier"
  }
  ```

- **PUT /translation/identifier**

  Updates an existing identifier in the translation database.

  Request Body:
  ```http
  PUT https://localhost:51058/api/translation/identifier
  Content-Type: application/json
  Authorization: api-key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  {
      "identifier": "current_identifier",
      "new_identifier": "new_identifier"
  }
  ```

- **DELETE /translation/identifier**

  Deletes an identifier from the translation database.

  Request Body:
  ```http
  DELETE https://localhost:51058/api/translation/identifier
  Content-Type: application/json
  Authorization: api-key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  {
      "identifier": "identifier_to_delete"
  }
  ```

- **POST /translation/address**

  Updates an address associated with an identifier in the translation database.

  Request Body:
  ```http
  POST https://localhost:51058/api/translation/address
  Content-Type: application/json
  Authorization: api-key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  {
      "projectID": "your_project_id",
      "identifier": "your_identifier",
      "address": "your_address"
  }
  ```

- **DELETE /translation/address**

  Deletes an address associated with an identifier from the translation database.

  Request Body:
  ```http
  DELETE https://localhost:51058/api/translation/address
  Content-Type: application/json
  Authorization: api-key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  {
      "projectID": "your_project_id",
      "identifier": "your_identifier"
  }
  ```

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the [GPL-3.0](https://raw.githubusercontent.com/Ashintosh/address-translation-layer/main/LICENSE) License.
