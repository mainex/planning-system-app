# Event Planning System

Kseniia Marchenko

ksumar4enko@gmail.com

## About the Project

A RESTful API for an event-planning system. Manages user, organizers, events and more. 

### Development Tools

- Node.js
- Express.js
- SQLite
- Postman

## Getting Started 

### Prerequisites

- Node.js (download from https://nodejs.org/en)
- npm 
- Postman (for testing, download from https://www.postman.com/downloads/)

### Installation

1. Clone the repository:
```
git clone https://github.com/mainex/planning-system-app
cd planning-system-app
```
2. Install npm:
```
npm install
```
3. Run the API
```
node .
```

### Testing the API

1. Import Postman collection ([kmarchenko_tests.postman_collection.json](kmarchenko_tests.postman_collection.json)).
2. Run the collecton.

## Usage

The system allows to create, delete, update and get details of users, events, organizers, reservations and event types.

_Detailed specification is shown in [api.yaml](api.yaml)._

### Example

Request:
```bash
curl -X GET "https://localhost:3000/api/user/123" -H "Content-Type: application/json"
```
Response:
```json
{
    "id": 1,
    "username": "jsmith",
    "firstname": "John",
    "lastname": "Smith"
}
```

## Contact

Kseniia Marchenko ksumar4enko@gmail.com - https://t.me/xmarchenko - https://github.com/mainex

Project Link: https://github.com/mainex/planninng-system-app


