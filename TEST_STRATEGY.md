# Test Execution Strategy

This document outlines the test execution strategy for the Impact Graph project, designed to optimize test run times while ensuring test reliability.

## Problem

The original test suite took over 20 minutes to run because:
1. Tests were run sequentially
2. Many tests have interdependencies and modify shared database state
3. Tests that could run in parallel were not identified and grouped properly

## Solution

After analyzing the test suite, we've implemented a two-phase approach to balance parallelization with dependency management:

### Test Phases

1. **Sequential Phase** - All repository tests that modify database state:
   - All repository tests run sequentially to avoid database conflicts
   - This ensures database integrity and prevents race conditions

2. **Parallel Phase** - Tests that can safely run in parallel:
   - Utils, Middleware, GraphQL, Apollo, Auth, Controllers, Entities, Server tests
   - Services, Adapters, Resolvers, and Migration tests
   - These can run in parallel after the sequential phase completes

### Specialized Test Groups

For more targeted testing, we've also created specialized test groups:

1. **Power-related Tests** - Tests related to power boosting functionality:
   - PowerBoostingRepository, PowerBalanceSnapshotRepository, PowerSnapshotRepository, etc.

2. **Project-related Tests** - Tests related to core project functionality:
   - ProjectRepository, DonationRepository, ProjectAddressRepository, etc.

3. **Other Repository Tests** - Remaining repository tests

### Running Tests

To run all tests in the optimized order:
```
npm test
```

This will first run all repository tests sequentially, then run the remaining tests in parallel.

To run specific test groups:
```
npm run test:sequential  # All repository tests in sequence
npm run test:parallel    # All non-repository tests in parallel
npm run test:power         # Power-related repository tests
npm run test:project-repos  # Project-related repository tests
npm run test:other-repos   # Other repository tests
```

### Legacy Test Commands

The original test commands are preserved with the `test:legacy:*` prefix for backward compatibility.

## Technical Details

### Sequential Phase
All repository tests run sequentially to ensure database integrity. This phase handles tests that modify shared database state and have interdependencies.

### Parallel Phase
After the sequential phase completes, remaining tests run in parallel. These tests focus on utility functions, middleware, services, and other components that don't heavily depend on database state.

## Future Improvements

1. **Database Isolation**: Consider using database transactions or separate test databases for better isolation
2. **Test Refactoring**: Refactor tests to reduce dependencies on shared state
3. **CI Integration**: Set up CI pipeline to run test groups in parallel on different workers
4. **Test Tagging**: Implement a tagging system to better categorize tests by dependency
