# Health Check API - AWS, GCP

The project is a simple Node.js Express application that provides a health check API to monitor the status of the service and its connection to the database. It uses sequalize ORM to interact with the database. The application implements a '/healthz' endpoint that gives the following responses.

## Responses:

- **Successful:**
  Returns a 200 OK status if the database is reachable and a health record is successfully inserted.
- **Service Unavailable:**
  Returns a 503 Service Unavailable status if the database connection fails.
- **Method Not Allowed:**
  Returns 405 Method Not Allowed for any methods other than GET.

## Requirements for Build and Deploy:

- **Node.js**
- **PostgreSQL**
- **Sequelize ORM**
- **DBeaver**
- **Postman**

## Instructions to build and deploy application locally:

**1. Clone the Repository**

```bash
git clone <repository-url>
cd <project-directory>
```

**2. Install all dependencies using Yarn** - Run the below command on terminal

```bash
yarn install
```

**3. Migrate the database using Sequelize** - Run the below command on terminal

```bash
yarn sequelize db:migrate
```

**4. Check if the table exists in DBeaver** - Open the DBeaver application and check if the HealthChecks table has been created in the database with the correct column headings.

**5. Start the postgres sql server using docker** - Run the below command on terminal

```bash
docker start <container-name>
```

**6. Start the node server** - Run the below command on VSCode terminal.

```bash
node app.js
```

The terminal should show:

```bash
Server is running at http://localhost:8080
Database synced!
```

**7. Test the API endpoint using Postman** - Send a GET request to the /healthz endpoint to check the status of the service and database.

```bash
GET http://localhost:8080/healthz
```

The responses will be:

- 200 OK: If the database is reachable and the health record is inserted successfully.
- 503 Service Unavailable: If the database is unreachable.
- 405 Method Not Allowed: If the method is other than GET.

**Command to Import the Certificate**
```bash
aws acm import-certificate \
  --certificate fileb://<path-to-certificate>/<certificate-file>.crt \
  --private-key fileb://<path-to-certificate>/<private-key-file>.key \
  --certificate-chain fileb://<path-to-certificate>/<certificate-chain-file>.ca-bundle \
  --region <aws-region> \
  --profile <aws-profile>
```
