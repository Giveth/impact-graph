# Impact Graph

ImpactQL is a GraphQL server, that enables rapid development of serverless impact project applications. It does this by taking care of the persistance of impact project data.

[Installation](#installation)
[Features](#features)
[Architecture](#architecture)
[Vision](#place-2)
[here](#place-2)

## Installation

```
git clone git@github.com:topiahq/impact-graph.git
cd impact-graph
npm i
cp .env.example .env
```

Create a database ([we recommend Postgres](https://medium.com/coding-blocks/creating-user-database-and-adding-access-on-postgresql-8bfcd2f4a91e) on your computer or server, we currently support for for MySQL, MariaDB, Postgres, MongoDB and SQLite.

Edit the .env file in your favorite code editor and the environmental variables

That's it

## Features

### Authentication

### Start fast

We enable impact projects to use our installation securely and privately for free, reach out for more details

### Own your own data

If this is more important you and your have the resources, deploy your own version of this

- An open source solution that enables you to keep control of your data
- Supports Bring Your Own Database (BYOD) and can be used with any database
- Built-in support for MySQL, MariaDB, Postgres, MongoDB and SQLite
- Works great with databases from popular hosting providers

## Architecture

The aim is to give a single entry point into any persistance solution that you want to use for your data.
The aim is for something like this:
![Impact Graph architecture](/docs/img/impact-graph.png)

We have so far only implemented these databases - MySQL, MariaDB, Postgres, MongoDB and SQLite

## Roadmap

The first usecase we are building is user registration and putting projects in the database

## Authentication

### Strategies

There are many strategies available for authentication

#### Email address and password

```javascript
mutation RegisterUser {
  mutation {
    register(
      data: {
        email: "testemail@email.com"
        password: "thisisatestpassword"
        firstName: "Bob"
        lastName: "Barker"
      }
    ) {
      id
      email
    }
  }
}

mutation {
  login(email: "testemail@email.com", password: "thisisatestpassword") {
    token
    user {
      firstName
      lastName
      email
    }
  }
}
```

#### Ethereum wallet

```javascript
mutation {
  loginWallet(walletAddress:"0xeC54C676E54c5e3e7F095D979eA13533b5dC2177", signature: "0x417f84a0d31abf872a8071da3e888a5708dfff76f4fcb9c07dde1a36a0e8241a6b8f3480a936efe661772cc6d8156504acec6789cc5246c363f0634b9ee956601b", email: "testemail@email.com") {
    token
    user {

      email
    }
  }
}
```

#### OAuth

- Designed to work with any OAuth service, it supports OAuth 1.0, 1.0A and 2.0
- Built-in support for many popular OAuth sign-in services

#### Supports both JSON Web Tokens (JWT)

- Supports both JSON Web Tokens

### Example queries

```javascript
query GetProjects {
  projects {
    title
    id
    description
  }
}

query AppProject {
  mutation {
    addProject(
      project: {
        title: "Unicorn DAC"
        description: "The Unicorn DAC, a non-hierarchical decentralized governance experimentWhy are bosses necessary? They arent. Self-managed organizations exist all over the world, but there is no template for how a ..."
      }
    ) {
      title
      description
    }
  }
}

mutation RegisterUser {
  mutation {
    register(
      data: {
        email: "testemail@email.com"
        password: "thisisatestpassword"
        firstName: "Bob"
        lastName: "Barker"
      }
    ) {
      id
      email
    }
  }
}

mutation LoginWallet {
  mutation {
    loginWallet(
      walletAddress: "0x......................................0"
      signature: "0xaslkdjasldkfjs8afjoi3jo3urjfo3902094304832094230948p34023948203423094802384idfb"
      email: "test@testington.com"
    ) {
      token
      user {
        email
      }
    }
  }
}

```

### Logging:

Default loggin is done by [Apollo Graph Manager](https://www.apollographql.com/docs/graph-manager/)
To make use of it you need to use register and provide a key in APOLLO_KEY in your .env file.
