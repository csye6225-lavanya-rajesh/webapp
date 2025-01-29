# Health Check API

The project is a simple Node.js Express application that provides a health check API to monitor the status of the service and its connection to the database. It uses sequalize ORM to interact with the database. The application implements a '/healthz' endpoint that gives the following responses. 

## Responses: 

- **Successful**
  Returns a 200 OK status if the database is reachable and a health record is successfully inserted. 
- **Service Unavailable**
  Returns a 503 Service Unavailable status if the database connection fails.
- **Method Not Allowed**
  Returns 405 Method Not Allowed for any methods other than GET.

## Requirements:

- **Node.js**
- **PostgreSQL**
- **Sequelize ORM**
- **DBeaver**
- **Postman**