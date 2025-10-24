# Impact Graph

[![CI/CD](https://github.com/Giveth/impact-graph/actions/workflows/staging-pipeline.yml/badge.svg)](https://github.com/Giveth/impact-graph/actions/workflows/staging-pipeline.yml)
[![CI/CD](https://github.com/Giveth/impact-graph/actions/workflows/master-pipeline.yml/badge.svg)](https://github.com/Giveth/impact-graph/actions/workflows/master-pipeline.yml)

## 1. Project Overview

Impact Graph is a GraphQL server designed to enable rapid development of serverless impact project applications by managing the persistence of and access to impact project data.

### Purpose

Impact Graph serves as the backend for Giveth's donation platform, providing a robust API for managing projects, donations, user accounts, and various features related to the Giveth ecosystem.

### Key Features

- **Project Management**: Create, Update, and Manage charitable projects
- **User Authentication**: Multiple authentication strategies including JWT and OAuth
- **Donation Processing**: Handle and verify donations on multiple blockchain networks
- **Power Boosting**: GIVpower allocation system for project ranking
- **Quadratic Funding (QF)**: Support for QF rounds and matching calculations
- **Admin Dashboard**: AdminJS-based interface for platform management
- **Social Verification**: Integration with various social networks for verification
- **Multi-Blockchain Support**: Integration with Ethereum, Gnosis Chain, Polygon, Celo, Optimism, and more

### Live Links

- Production API: https://serve.giveth.io/graphql
- Staging API: https://staging.serve.giveth.io/graphql
- Frontend application: https://giveth.io

## 2. Architecture Overview

### System Diagram

Impact Graph acts as a central API gateway that connects the frontend application with various backend services and data sources:

```
Frontend Application
       ↓ ↑
Impact Graph (GraphQL API)
       ↓ ↑
┌──────┴───────┬─────────────┬─────────────┬────────────┐
│              │             │             │            │
Database    Blockchain    External      Pinata       Redis
(Postgres)   Networks       APIs       (File Store)   Cache
```

### Tech Stack

- **Server**: Node.js with TypeScript
- **API**: GraphQL (Apollo Server)
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT, OAuth, Web3 wallet authentication
- **Caching**: Redis
- **Task Processing**: Bull for job queues
- **Admin Interface**: AdminJS
- **CI/CD**: GitHub Actions
- **Containerization**: Docker
- **Blockchain Integration**: Web3.js, Ethers.js
- **File Storage**: Pinata IPFS

### Data Flow

1. Frontend applications consume the GraphQL API endpoints
2. GraphQL resolvers process requests, applying business logic
3. Data is persisted in PostgreSQL via TypeORM
4. Blockchain transactions are verified using on-chain data
5. Scheduled tasks run via cron jobs to sync data, process snapshots, etc.
6. Redis is used for caching and task queues
7. Notifications are sent to users through integrated notification services

### Process Diagrams

#### Donation Flow

This diagram illustrates how donations are processed in the system:

[![Donation Flow](https://mermaid.ink/img/eyJjb2RlIjoic2VxdWVuY2VEaWFncmFtXG4gICAgYXV0b251bWJlclxuICAgIGFjdG9yIFVzZXJcbiAgICBwYXJ0aWNpcGFudCBGcm9udGVuZFxuICAgIHBhcnRpY2lwYW50IE1ldGFtYXNrXG4gICAgcGFydGljaXBhbnQgQmFja2VuZFxuICAgIHBhcnRpY2lwYW50IERCXG4gICAgcGFydGljaXBhbnQgTW9ub3N3YXBcblxuICAgIFVzZXIgLT4-IEZyb250ZW5kOiBXYW50IHRvIGRvbmF0ZVxuICAgIG5vdGUgb3ZlciBGcm9udGVuZDogQ2hlY2sgcHJvamVjdCB3YWxsZXQgYWRkcmVzc1xuXG4gICAgRnJvbnRlbmQgLT4-IE1ldGFtYXNrIDogQ3JlYXRlIHRyYW5zYWN0aW9uXG4gICAgTWV0YW1hc2sgLS0-PiBVc2VyOiBTaG93IGNvbmZpcm0gdHJhbnNhY3Rpb24gcG9wdXBcbiAgICBVc2VyIC0-PiBNZXRhbWFzazogT2tcbiAgICBNZXRhbWFzayAtPj4gRnJvbnRlbmQgOiBGcm9udGVuZCBnZXQgdHhIYXNoIGJ5IHdlYjNcbiAgICBGcm9udGVuZCAtPj4gQmFja2VuZDogU2F2ZSBuZXcgZG9uYXRpb25cbiAgICBub3RlIG92ZXIgQmFja2VuZDogVmFsaWRhdGUgZG9uYXRpb24ncyBpbmZvIHdpdGggcHJvamVjdCB3YWxsZXQgYWRkcmVzcywgdXNlciwgLi5cbiAgICBCYWNrZW5kIC0-PiBEQjogU2F2ZSBkb25hdGlvbiB0byBEQlxuICAgIERCIC0tPj4gQmFja2VuZCA6IE9rXG4gICAgQmFja2VuZCAtPj4gTW9ub3N3YXAgOiBHZXQgcHJpY2Ugb2YgZG9uYXRlZCB0b2tlblxuICAgIGFsdCBNb25vc3dhcCBjYW4gZmV0Y2ggcHJpY2U6XG4gICAgICAgIE1vbm9zd2FwIC0tPj4gQmFja2VuZCA6IHJldHVybiBwcmljZVxuICAgICAgICBCYWNrZW5kIC0-PiBEQjogVXBkYXRlIHByaWNlVXNkIGFuZCB2YWx1ZVVzZCBvZiBkb25hdGlvblxuICAgICAgICBEQiAtLT4-IEJhY2tlbmQ6IE9rXG4gICAgICAgIEJhY2tlbmQgLT4-IERCOiBVcGRhdGUgcHJvamVjdCB0b3RhbERvbmF0aW9ucyB2YWx1ZVVzZFxuICAgICAgICBEQiAtLT4-IEJhY2tlbmQ6IE9rXG4gICAgZWxzZSBSZXR1cm4gZXJyb3I6XG4gICAgICAgIE1vbm9zd2FwIC0tPj4gQmFja2VuZCA6IFJldHVybiBFcnJvclxuICAgICAgICBub3RlIG92ZXIgQmFja2VuZDogRG8gbm90aGluZ1xuICAgIGVuZFxuICAgIEJhY2tlbmQgLS0-PiBGcm9udGVuZDogT2tcbiIsIm1lcm1haWQiOnsidGhlbWUiOiJkZWZhdWx0In0sInVwZGF0ZUVkaXRvciI6dHJ1ZSwiYXV0b1N5bmMiOnRydWUsInVwZGF0ZURpYWdyYW0iOmZhbHNlfQ)](https://mermaid-js.github.io/mermaid-live-editor/edit/#eyJjb2RlIjoic2VxdWVuY2VEaWFncmFtXG4gICAgYXV0b251bWJlclxuICAgIGFjdG9yIFVzZXJcbiAgICBwYXJ0aWNpcGFudCBGcm9udGVuZFxuICAgIHBhcnRpY2lwYW50IE1ldGFtYXNrXG4gICAgcGFydGljaXBhbnQgQmFja2VuZFxuICAgIHBhcnRpY2lwYW50IERCXG4gICAgcGFydGljaXBhbnQgTW9ub3N3YXBcblxuICAgIFVzZXIgLT4-IEZyb250ZW5kOiBXYW50IHRvIGRvbmF0ZVxuICAgIG5vdGUgb3ZlciBGcm9udGVuZDogQ2hlY2sgcHJvamVjdCB3YWxsZXQgYWRkcmVzc1xuXG4gICAgRnJvbnRlbmQgLT4-IE1ldGFtYXNrIDogQ3JlYXRlIHRyYW5zYWN0aW9uXG4gICAgTWV0YW1hc2sgLS0-PiBVc2VyOiBTaG93IGNvbmZpcm0gdHJhbnNhY3Rpb24gcG9wdXBcbiAgICBVc2VyIC0-PiBNZXRhbWFzazogT2tcbiAgICBNZXRhbWFzayAtPj4gRnJvbnRlbmQgOiBGcm9udGVuZCBnZXQgdHhIYXNoIGJ5IHdlYjNcbiAgICBGcm9udGVuZCAtPj4gQmFja2VuZDogU2F2ZSBuZXcgZG9uYXRpb25cbiAgICBub3RlIG92ZXIgQmFja2VuZDogVmFsaWRhdGUgZG9uYXRpb24ncyBpbmZvIHdpdGggcHJvamVjdCB3YWxsZXQgYWRkcmVzcywgdXNlciwgLi5cbiAgICBCYWNrZW5kIC0-PiBEQjogU2F2ZSBkb25hdGlvbiB0byBEQlxuICAgIERCIC0tPj4gQmFja2VuZCA6IE9rXG4gICAgQmFja2VuZCAtPj4gTW9ub3N3YXAgOiBHZXQgcHJpY2Ugb2YgZG9uYXRlZCB0b2tlblxuICAgIGFsdCBNb25vc3dhcCBjYW4gZmV0Y2ggcHJpY2U6XG4gICAgICAgIE1vbm9zd2FwIC0tPj4gQmFja2VuZCA6IHJldHVybiBwcmljZVxuICAgICAgICBCYWNrZW5kIC0-PiBEQjogVXBkYXRlIHByaWNlVXNkIGFuZCB2YWx1ZVVzZCBvZiBkb25hdGlvblxuICAgICAgICBEQiAtLT4-IEJhY2tlbmQ6IE9rXG4gICAgICAgIEJhY2tlbmQgLT4-IERCOiBVcGRhdGUgcHJvamVjdCB0b3RhbERvbmF0aW9ucyB2YWx1ZVVzZFxuICAgICAgICBEQiAtLT4-IEJhY2tlbmQ6IE9rXG4gICAgZWxzZSBSZXR1cm4gZXJyb3I6XG4gICAgICAgIE1vbm9zd2FwIC0tPj4gQmFja2VuZCA6IFJldHVybiBFcnJvclxuICAgICAgICBub3RlIG92ZXIgQmFja2VuZDogRG8gbm90aGluZ1xuICAgIGVuZFxuICAgIEJhY2tlbmQgLS0-PiBGcm9udGVuZDogT2tcbiIsIm1lcm1haWQiOiJ7XG4gIFwidGhlbWVcIjogXCJkZWZhdWx0XCJcbn0iLCJ1cGRhdGVFZGl0b3IiOnRydWUsImF1dG9TeW5jIjp0cnVlLCJ1cGRhdGVEaWFncmFtIjpmYWxzZX0)

#### Social Network Verification Flow

This diagram shows how project verification works through social network accounts:

[![Social Network Verification](https://mermaid.ink/img/pako:eNrFVcFu2zAM_RXCl7VAmgA9-hCga9euQJcNS7tTgEGVaEeNLXkSnSwo-u-jJDtJ03TYgA7zyYbI98j3aOoxk1Zhlmcef7RoJF5oUTpRzwzwIyRZB3ceXfpuhCMtdSMMwaWzhtColyfvhVwcPJhOQHiYWqlFBROklXULCGEzk4J7TDgZj3uYHM5FVYFQaoKrlPvF2UJXCHVLgrQ1cOQ5UJsSfDzvoQUjNc4-oKRv6HShZQy_tK6-VseJ0lhCsEt0W74pEmjTtARKkOBXcKi0j3AlGnSCUwSQ4wQmPWcBX8X6JEIItK6C-zXISqOhazWIiI7ruuODAQyHw4TQ5cFJEKBXI4evDql1JsAcEGo64YgOD1o2C8h2SoDppVDKofcpm32IBMHYHM78YpPlUCiQ1rCeFPutbKk7c0I0bAhvwsFLom5uKoIL7aV13RT0rLu2vih55Hfd9SPJvt9z9EglKFhpmvNMSm7kO1lGCd7w2Lo1eHKs85ZsI-R4HKq9Yktj_doUNjiRUG4DyPMK90pMsveZKXQz26HNK2vLCt-iyzIiDVKX4a_8o-6iGdPwEVOYoORe_6q9neDouVZJ3W3mgcG-wFRiFwtHoOmdh4cVHXc_Smr5OgheOFsDzdHhjoJbDW-0WbBM5i1UrDqs_6bjvnb7HHGbzYkan49GotHDvuKhtPVoeTqq8TdUYdG9Oo8HbLqKu6y3IO2xKMzu9oqG0dzZFeBPiU3cqbpIjjIoLEWlX-c4560RN-IyLllU8MyciO6wCjGagrIHdjIUvJS3E_H57O7242naPuDbKOxhSbdLsuh3YtmuPfi5bSt-10tkvbi4IHNg4UZZg6Z1jfW4J-AefSG4fPWPebNBVqOrhVZ8Cz_G2zDjX4WnIMv5VWEh2opm2cw8cWjb8J2EH5TmiznLC1F5HGSiJTtdG5nl5Frsg7qbvIt6-gW6nqHe)](https://mermaid-js.github.io/mermaid-live-editor/edit#pako:eNrFVcFu2zAM_RXCl7VAmgA9-hCga9euQJcNS7tTgEGVaEeNLXkSnSwo-u-jJDtJ03TYgA7zyYbI98j3aOoxk1Zhlmcef7RoJF5oUTpRzwzwIyRZB3ceXfpuhCMtdSMMwaWzhtColyfvhVwcPJhOQHiYWqlFBROklXULCGEzk4J7TDgZj3uYHM5FVYFQaoKrlPvF2UJXCHVLgrQ1cOQ5UJsSfDzvoQUjNc4-oKRv6HShZQy_tK6-VseJ0lhCsEt0W74pEmjTtARKkOBXcKi0j3AlGnSCUwSQ4wQmPWcBX8X6JEIItK6C-zXISqOhazWIiI7ruuODAQyHw4TQ5cFJEKBXI4evDql1JsAcEGo64YgOD1o2C8h2SoDppVDKofcpm32IBMHYHM78YpPlUCiQ1rCeFPutbKk7c0I0bAhvwsFLom5uKoIL7aV13RT0rLu2vih55Hfd9SPJvt9z9EglKFhpmvNMSm7kO1lGCd7w2Lo1eHKs85ZsI-R4HKq9Yktj_doUNjiRUG4DyPMK90pMsveZKXQz26HNK2vLCt-iyzIiDVKX4a_8o-6iGdPwEVOYoORe_6q9neDouVZJ3W3mgcG-wFRiFwtHoOmdh4cVHXc_Smr5OgheOFsDzdHhjoJbDW-0WbBM5i1UrDqs_6bjvnb7HHGbzYkan49GotHDvuKhtPVoeTqq8TdUYdG9Oo8HbLqKu6y3IO2xKMzu9oqG0dzZFeBPiU3cqbpIjjIoLEWlX-c4560RN-IyLllU8MyciO6wCjGagrIHdjIUvJS3E_H57O7242naPuDbKOxhSbdLsuh3YtmuPfi5bSt-10tkvbi4IHNg4UZZg6Z1jfW4J-AefSG4fPWPebNBVqOrhVZ8Cz_G2zDjX4WnIMv5VWEh2opm2cw8cWjb8J2EH5TmiznLC1F5HGSiJTtdG5nl5Frsg7qbvIt6-gW6nqHe)

## 3. Getting Started

### Prerequisites

- Node.js (v20.11.0 or later as specified in .nvmrc)
- PostgreSQL database
- Redis instance
- Various API keys for external services (detailed in environment variables)

### Installation Steps

1. Clone the repository:

   ```
   git clone git@github.com:Giveth/impact-graph.git
   cd impact-graph
   ```

2. Install dependencies:

   ```
   nvm use  # Uses version specified in .nvmrc
   npm i
   ```

3. Configure environment:

   ```
   cp config/example.env config/development.env
   ```

4. Set up database:

   - Either create a PostgreSQL database manually, or
   - Use Docker Compose to spin up a local database:
     ```
     docker-compose -f docker-compose-local-postgres-redis.yml up -d
     ```

5. Run database migrations:

   ```
   npm run db:migrate:run:local
   ```

6. Start the development server:
   ```
   npm start
   ```

### Configuration

The application is configured via environment variables. Key configuration areas include:

1. **Database Connection**:

   ```
   TYPEORM_DATABASE_TYPE=postgres
   TYPEORM_DATABASE_NAME=givethio
   TYPEORM_DATABASE_USER=postgres
   TYPEORM_DATABASE_PASSWORD=postgres
   TYPEORM_DATABASE_HOST=localhost
   TYPEORM_DATABASE_PORT=5442
   ```

2. **Authentication**:

   ```
   JWT_SECRET=your_jwt_secret
   JWT_MAX_AGE=time_in_seconds
   BCRYPT_SALT=$2b$10$44gNUOnBXavOBMPOqzd48e
   ```

3. **Blockchain Providers**:

   ```
   XDAI_NODE_HTTP_URL=your_xdai_node_url
   INFURA_API_KEY=your_infura_key
   ETHERSCAN_API_KEY=your_etherscan_key
   ```

4. **External Services**:
   ```
   PINATA_API_KEY=your_pinata_key
   PINATA_SECRET_API_KEY=your_pinata_secret
   STRIPE_KEY=your_stripe_key
   ```

For a complete list of configuration options, refer to the `config/example.env` file.

## 4. Usage Instructions

### Running the Application

**Development mode**:

```
npm start
```

**Production mode**:

```
npm run build
npm run production
```

**Docker**:

```
# Development
docker-compose -f docker-compose-local.yml up -d

# Production
docker-compose -f docker-compose-production.yml up -d
```

### Testing

Run all tests:

```
npm test
```

Run specific test suites:

```
npm run test:userRepository
npm run test:projectResolver
npm run test:donationRepository
# See package.json for all test scripts
```

For running tests with necessary environment variables:

```
PINATA_API_KEY=0000000000000 PINATA_SECRET_API_KEY=00000000000000000000000000000000000000000000000000000000 ETHERSCAN_API_KEY=0000000000000000000000000000000000 XDAI_NODE_HTTP_URL=https://xxxxxx.xdai.quiknode.pro INFURA_API_KEY=0000000000000000000000000000000000 npm run test
```

### Common Tasks

**Creating migrations**:

```
npx typeorm-ts-node-commonjs migration:create ./migration/create_new_table
```

**Running migrations**:

```
npm run db:migrate:run:local  # For development
npm run db:migrate:run:production  # For production
```

**Reverting migrations**:

```
npm run db:migrate:revert:local
```

**Admin Dashboard**:
Access the admin dashboard at `/admin` with these default credentials (in development):

- Admin user: test-admin@giveth.io / admin
- Campaign manager: campaignManager@giveth.io / admin
- Reviewer: reviewer@giveth.io / admin
- Operator: operator@giveth.io / admin

Creating an admin user manually:

```sql
-- First generate the hash with bcrypt
const bcrypt = require('bcrypt');
bcrypt.hash(
  'yourPassword',
  Number('yourSalt'),
).then(hash => {console.log('hash',hash)}).catch(e=>{console.log("error", e)});

-- Then insert the user in the database
INSERT INTO public.user (email, "walletAddress", role, "loginType", name, "encryptedPassword") VALUES
('test@giveth.io', 'walletAddress', 'admin', 'wallet', 'test', 'aboveHash')
```

### Project Statuses

| ID  | Symbol        | Name          | Description                                                 | Who can change to       |
| --- | ------------- | ------------- | ----------------------------------------------------------- | ----------------------- |
| 1   | rejected      | rejected      | Project rejected by Giveth or platform owner                |                         |
| 2   | pending       | pending       | Project created, pending approval                           |                         |
| 3   | clarification | clarification | Clarification requested by Giveth or platform owner         |                         |
| 4   | verification  | verification  | Verification in progress (including KYC)                    |                         |
| 5   | activated     | activated     | Active project                                              | project owner and admin |
| 6   | deactivated   | deactivated   | Deactivated by user or Giveth Admin                         | project owner and admin |
| 7   | cancelled     | cancelled     | Cancelled by Giveth Admin                                   | admin                   |
| 8   | drafted       | drafted       | Project draft for a potential new project, can be discarded | project owner           |

- If a project is **cancelled**, only admin can activate that
- If project is **deactive**, both admins and project owner can activate it
- Both admins and project owner can deactivate an **active** project

## 5. Deployment Process

### Environments

- **Staging**: Used for pre-release testing
- **Production**: Live environment for end users

### Deployment Steps

1. Changes are pushed to the appropriate branch (staging or master)
2. GitHub Actions automatically runs tests and builds the application
3. If all tests pass, the application is deployed to the corresponding environment
4. Database migrations are automatically applied

### CI/CD Integration

The project uses GitHub Actions for continuous integration and deployment:

- `.github/workflows/staging-pipeline.yml`: Deploys to staging environment
- `.github/workflows/master-pipeline.yml`: Deploys to production environment

## 6. Troubleshooting

### Common Issues

**Database Connection Issues**:

- Verify database credentials in environment variables
- Check that the database server is running
- Ensure network connectivity between application and database

**Authentication Failures**:

- Check JWT_SECRET configuration
- Verify OAuth provider settings

**Blockchain Integration Issues**:

- Ensure node providers (Infura, etc.) are configured correctly
- Check API keys for blockchain explorers

### Logs and Debugging

**Viewing Logs**:

```
# Install bunyan for formatted logs
npm i -g bunyan
tail -f logs/impact-graph.log | bunyan
```

**Development Debugging**:

1. Use GraphQL playground at `/graphql` to test queries
2. Check server logs for detailed error information
3. Use the AdminJS interface to inspect data

## 7. Feature Details

### Power Boosting System

Impact Graph supports ranking projects based on power boosted by users. Users with GIVpower can boost a project by allocating a percentage of their GIVpower to that project. The system regularly takes snapshots of user GIVpower balance and boost percentages.

#### Database Snapshot Architecture

The Power Boosting system uses several key tables:

- **power_boosting**: Records when a user boosts a project
- **power_round**: Specifies the current round number
- **power_snapshot**: Records created on each snapshot interval
- **power_boosting_snapshot**: Stores boosting percentages at snapshot times
- **power_balance_snapshot**: Records user GIVpower balance at snapshot times

Snapshots are implemented using the `pg_cron` extension on Postgres, which calls a database procedure `TAKE_POWER_BOOSTING_SNAPSHOT` at regular intervals.

#### Materialized Views

The system uses materialized views to efficiently calculate project boost values:

- **user_project_power_view**: Shows how much GIVpower each user has boosted to a project
- **project_power_view**: Calculates projects' total power and ranks them
- **project_future_power_view**: Shows what will be the rank of projects in the next round

For detailed information on the Power Boosting system, see [Power Boosting Documentation](./docs/powerBoosting.md).

## Additional Resources

- [Power Boosting Documentation](./docs/powerBoosting.md)
- [QF Round Instructions](./docs/qfRoundInstruction.md)
- [Admin Permissions](./docs/adminPermissions.md)
- [Campaigns Instructions](./docs/campaignsInstruction.md)

## Contributing

Please run `npm run prettify` before committing your changes to ensure code style consistency.

## License

This project is licensed under the terms included in the [LICENSE](LICENSE) file.
