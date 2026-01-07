## **Overview:**

Our project provides recommendations to people on which stocks to sell or buy. People
using this application would be able to make more informed decisions when
manipulating their stock market portfolio.

## **Architecture:**

The application follows a microservices-inspired architecture hosted on Microsoft Azure.
1.  **Frontend**
    * **Tech:** React
    * **Hosting:** Azure Static Web Apps
    * **Role:** Serves the user interface. It is decoupled from the backend and communicates strictly via REST API.

2.  **Backend**
    * **Tech:** Node.js / Express
    * **Hosting:** Azure App Service
    * **Role:** Handles business logic, authentication, and calculation. It acts as the gatekeeper to the database.

3.  **Database**
    * **Tech:** PostgreSQL
    * **Hosting:** Azure Database for PostgreSQL
    * **Role:** Relational storage for user, stock, and analysis data.

4.  **Data Pipeline**
    * **Tech:** Azure Functions
    * **Frequency:** Daily (Market Close)
    * **Role:** Automatically wakes up once a day to fetch the latest stock prices and financial reports from external APIs and updates the PostgreSQL database.

5.  **CI CD**
    * **Tech:** Github Actions
    * **Frequency:** On every pull request
    * **Role:** The backend runs an in-memory integration test to verify API endpoints and SQL logic without touching the production database. 
    When code is merged to main, Azure automatically pulls the latest build and deploys it.