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
// You should have installed chromium on your system, it can be installed by your or package maneger (apt,brew, ..)
npm i
// If you had problem on npm install, you can see https://stackoverflow.com/a/66044814/9372962 (Mac os users)
cp config/example.env config/development.env
```

Edit the config/development.env file in your favorite code editor and the environmental variables

[Create a database](https://medium.com/coding-blocks/creating-user-database-and-adding-access-on-postgresql-8bfcd2f4a91e) (we recommend Postgres) on your computer or server, we currently support for MySQL, MariaDB, Postgres, MongoDB and SQLite.
Or if you want, you can run the docker-compose like this:
`docker-compose -f docker-compose-local-postgres-redis.yml up -d`
and put these to your `development.env`

```
TYPEORM_DATABASE_TYPE=postgres
TYPEORM_DATABASE_NAME=givethio
TYPEORM_DATABASE_USER=postgres
TYPEORM_DATABASE_PASSWORD=postgres
TYPEORM_DATABASE_HOST=localhost
TYPEORM_DATABASE_PORT=5442
```


## RUN
```
npm start
```

## Log
In localhost and test we put logs in console and file but in production and staging we just use file for writing logs
You can see logs beautifully with this command

```
 npm i -g bunyan
 tail -f logs/impact-graph.log |bunyan

```


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
### Admin panel
We use [Admin Bro](https://github.com/SoftwareBrothers/adminjs) for Admin dashboard
You should navigate to `/admin` for browsing admin panel.
in your local database you can hash a desired password with `BCRYPT_SALT` that is in your `config/development.env` with 
[bcrypt](https://github.com/kelektiv/node.bcrypt.js) then you set that value in `encryptedPassword` of your user in DB and
change `role` of user to `admin` in db
Now you can login in admin dashboard with your user's `email` and the `password` you already set 

**PS**:
A simple script for create encryptedPassword
```
const bcrypt = require('bcrypt');

bcrypt.hash(
  'yourPassword',
  Number('yourSalt'),
).then(hash => {console.log('hash',hash)}).catch(e=>{console.log("error", e)});

```


### Logging:

Default loggin is done by [Apollo Graph Manager](https://www.apollographql.com/docs/graph-manager/)
To make use of it you need to use register and provide a key in APOLLO_KEY in your .env file.


### Changes to the database

Dropping and seeding the database can be done like this during testing:
```
DROP_DATABASE=true
SEED_DATABASE=true
```

After a site is live or if you want to keep your database you need to use database migrations.

This can be done either by creating a new migration file with:

```
npm run typeorm:cli migration:create -- -n UpdateUserEmailUnique -d migration
```

Or by changing the entities and generating the migrations with:
```
npm run typeorm:cli migration:generate -- -n UpdateUserEmailUnique
```

Then you need to run the migrations like so:

```
npm run typeorm:cli -- migration:run
```

If you want to revert last migration :

```
npm run typeorm:cli -- migration:revert
```

### TEST
For running tests you need to register infura and etherscan api-key, and you should pass this environment variables

`PINATA_API_KEY=0000000000000 PINATA_SECRET_API_KEY=00000000000000000000000000000000000000000000000000000000  ETHERSCAN_API_KEY=0000000000000000000000000000000000 XDAI_NODE_HTTP_URL=https://xxxxxx.xdai.quiknode.pro INFURA_API_KEY=0000000000000000000000000000000000 ETHEREUM_NODE_ID=INFURA_API_KEY npm run test` 

### PRE_COMMITS
Please before committing your changes run
`npm run prettify` to fix eslint and prettify warnings

You will need to add the above command to your build process so that all database migrations are run upon deployments.

### Statuses 
You can generate table with this site
https://www.tablesgenerator.com/markdown_tables

| id | symbol        | name          | description                                                                          | Who can change to       |
|----|---------------|---------------|--------------------------------------------------------------------------------------|-------------------------|
| 1  | rejected      | rejected      | his project has been rejected by Giveth or platform owner, We dont use it now        |                         |
| 2  | pending       | pending       | This project is created, but pending approval, We dont use it now                    |                         |
| 3  | clarification | clarification | Clarification requested by Giveth or platform owner, We dont use it now              |                         |
| 4  | verification  | verification  | Verification in progress (including KYC or otherwise), We dont use it now            |                         |
| 5  | activated     | activated     | This is an active project                                                            | project owner and admin |
| 6  | deactivated   | deactivated   | Deactivated with user or Giveth Admin                                                | project owner and admin |
| 7  | cancelled     | cancelled     | Cancelled by Giveth Admin                                                            | admin                   |
| 8  | drafted       | drafted       | This project is created as a draft for a potential new project, but can be discarded | project owner           |

**PS** 
* If a project is **cancelled** just admin can activate that
* If project is **deactive** both admins and project owner can activate it
* Both admins and project owner can deactivate an **active** project
### Diagrams

#### Donation Flow
[![](https://mermaid.ink/img/eyJjb2RlIjoic2VxdWVuY2VEaWFncmFtXG4gICAgYXV0b251bWJlclxuICAgIGFjdG9yIFVzZXJcbiAgICBwYXJ0aWNpcGFudCBGcm9udGVuZFxuICAgIHBhcnRpY2lwYW50IE1ldGFtYXNrXG4gICAgcGFydGljaXBhbnQgQmFja2VuZFxuICAgIHBhcnRpY2lwYW50IERCXG4gICAgcGFydGljaXBhbnQgTW9ub3N3YXBcblxuICAgIFVzZXIgLT4-IEZyb250ZW5kOiBXYW50IHRvIGRvbmF0ZVxuICAgIG5vdGUgb3ZlciBGcm9udGVuZDogQ2hlY2sgcHJvamVjdCB3YWxsZXQgYWRkcmVzc1xuXG4gICAgRnJvbnRlbmQgLT4-IE1ldGFtYXNrIDogQ3JlYXRlIHRyYW5zYWN0aW9uXG4gICAgTWV0YW1hc2sgLS0-PiBVc2VyOiBTaG93IGNvbmZpcm0gdHJhbnNhY3Rpb24gcG9wdXBcbiAgICBVc2VyIC0-PiBNZXRhbWFzazogT2tcbiAgICBNZXRhbWFzayAtPj4gRnJvbnRlbmQgOiBGcm9udGVuZCBnZXQgdHhIYXNoIGJ5IHdlYjNcbiAgICBGcm9udGVuZCAtPj4gQmFja2VuZDogU2F2ZSBuZXcgZG9uYXRpb25cbiAgICBub3RlIG92ZXIgQmFja2VuZDogVmFsaWRhdGUgZG9uYXRpb24ncyBpbmZvIHdpdGggcHJvamVjdCB3YWxsZXQgYWRkcmVzcywgdXNlciwgLi5cbiAgICBCYWNrZW5kIC0-PiBEQjogU2F2ZSBkb25hdGlvbiB0byBEQlxuICAgIERCIC0tPj4gQmFja2VuZCA6IE9rXG4gICAgQmFja2VuZCAtPj4gTW9ub3N3YXAgOiBHZXQgcHJpY2Ugb2YgZG9uYXRlZCB0b2tlblxuICAgIGFsdCBNb25vc3dhcCBjYW4gZmV0Y2ggcHJpY2U6XG4gICAgICAgIE1vbm9zd2FwIC0tPj4gQmFja2VuZCA6IHJldHVybiBwcmljZVxuICAgICAgICBCYWNrZW5kIC0-PiBEQjogVXBkYXRlIHByaWNlVXNkIGFuZCB2YWx1ZVVzZCBvZiBkb25hdGlvblxuICAgICAgICBEQiAtLT4-IEJhY2tlbmQ6IE9rXG4gICAgICAgIEJhY2tlbmQgLT4-IERCOiBVcGRhdGUgcHJvamVjdCB0b3RhbERvbmF0aW9ucyB2YWx1ZVVzZFxuICAgICAgICBEQiAtLT4-IEJhY2tlbmQ6IE9rXG4gICAgZWxzZSBSZXR1cm4gZXJyb3I6XG4gICAgICAgIE1vbm9zd2FwIC0tPj4gQmFja2VuZCA6IFJldHVybiBFcnJvclxuICAgICAgICBub3RlIG92ZXIgQmFja2VuZDogRG8gbm90aGluZ1xuICAgIGVuZFxuICAgIEJhY2tlbmQgLS0-PiBGcm9udGVuZDogT2tcbiIsIm1lcm1haWQiOnsidGhlbWUiOiJkZWZhdWx0In0sInVwZGF0ZUVkaXRvciI6dHJ1ZSwiYXV0b1N5bmMiOnRydWUsInVwZGF0ZURpYWdyYW0iOmZhbHNlfQ)](https://mermaid-js.github.io/mermaid-live-editor/edit/#eyJjb2RlIjoic2VxdWVuY2VEaWFncmFtXG4gICAgYXV0b251bWJlclxuICAgIGFjdG9yIFVzZXJcbiAgICBwYXJ0aWNpcGFudCBGcm9udGVuZFxuICAgIHBhcnRpY2lwYW50IE1ldGFtYXNrXG4gICAgcGFydGljaXBhbnQgQmFja2VuZFxuICAgIHBhcnRpY2lwYW50IERCXG4gICAgcGFydGljaXBhbnQgTW9ub3N3YXBcblxuICAgIFVzZXIgLT4-IEZyb250ZW5kOiBXYW50IHRvIGRvbmF0ZVxuICAgIG5vdGUgb3ZlciBGcm9udGVuZDogQ2hlY2sgcHJvamVjdCB3YWxsZXQgYWRkcmVzc1xuXG4gICAgRnJvbnRlbmQgLT4-IE1ldGFtYXNrIDogQ3JlYXRlIHRyYW5zYWN0aW9uXG4gICAgTWV0YW1hc2sgLS0-PiBVc2VyOiBTaG93IGNvbmZpcm0gdHJhbnNhY3Rpb24gcG9wdXBcbiAgICBVc2VyIC0-PiBNZXRhbWFzazogT2tcbiAgICBNZXRhbWFzayAtPj4gRnJvbnRlbmQgOiBGcm9udGVuZCBnZXQgdHhIYXNoIGJ5IHdlYjNcbiAgICBGcm9udGVuZCAtPj4gQmFja2VuZDogU2F2ZSBuZXcgZG9uYXRpb25cbiAgICBub3RlIG92ZXIgQmFja2VuZDogVmFsaWRhdGUgZG9uYXRpb24ncyBpbmZvIHdpdGggcHJvamVjdCB3YWxsZXQgYWRkcmVzcywgdXNlciwgLi5cbiAgICBCYWNrZW5kIC0-PiBEQjogU2F2ZSBkb25hdGlvbiB0byBEQlxuICAgIERCIC0tPj4gQmFja2VuZCA6IE9rXG4gICAgQmFja2VuZCAtPj4gTW9ub3N3YXAgOiBHZXQgcHJpY2Ugb2YgZG9uYXRlZCB0b2tlblxuICAgIGFsdCBNb25vc3dhcCBjYW4gZmV0Y2ggcHJpY2U6XG4gICAgICAgIE1vbm9zd2FwIC0tPj4gQmFja2VuZCA6IHJldHVybiBwcmljZVxuICAgICAgICBCYWNrZW5kIC0-PiBEQjogVXBkYXRlIHByaWNlVXNkIGFuZCB2YWx1ZVVzZCBvZiBkb25hdGlvblxuICAgICAgICBEQiAtLT4-IEJhY2tlbmQ6IE9rXG4gICAgICAgIEJhY2tlbmQgLT4-IERCOiBVcGRhdGUgcHJvamVjdCB0b3RhbERvbmF0aW9ucyB2YWx1ZVVzZFxuICAgICAgICBEQiAtLT4-IEJhY2tlbmQ6IE9rXG4gICAgZWxzZSBSZXR1cm4gZXJyb3I6XG4gICAgICAgIE1vbm9zd2FwIC0tPj4gQmFja2VuZCA6IFJldHVybiBFcnJvclxuICAgICAgICBub3RlIG92ZXIgQmFja2VuZDogRG8gbm90aGluZ1xuICAgIGVuZFxuICAgIEJhY2tlbmQgLS0-PiBGcm9udGVuZDogT2tcbiIsIm1lcm1haWQiOiJ7XG4gIFwidGhlbWVcIjogXCJkZWZhdWx0XCJcbn0iLCJ1cGRhdGVFZGl0b3IiOnRydWUsImF1dG9TeW5jIjp0cnVlLCJ1cGRhdGVEaWFncmFtIjpmYWxzZX0)
