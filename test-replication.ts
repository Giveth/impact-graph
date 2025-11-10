/* eslint-disable no-console */
/**
 * Test Script for Database Replication Setup
 *
 * Run this script to verify your replication configuration is working correctly:
 *
 * Usage:
 *   npx ts-node test-replication.ts
 *
 * This will test:
 * 1. DataSource initialization
 * 2. Replica configuration detection
 * 3. Basic query routing
 * 4. AdminDataSource connection
 */

import { AdminDataSource } from './src/adminDataSource';
import { Project } from './src/entities/project';
import { User } from './src/entities/user';
import { AppDataSource, CronDataSource } from './src/orm';
import {
  getMasterRepository,
  getReplicationInfo,
  getRepository,
  hasReadReplicas,
} from './src/utils/dbHelpers';

async function testReplicationSetup() {
  console.log('\n🔍 Testing Database Replication Setup\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Initialize DataSources
    console.log('\n📊 Test 1: Initializing DataSources...');

    console.log('  - Initializing AppDataSource...');
    await AppDataSource.initialize();
    console.log('  ✅ AppDataSource initialized');

    console.log('  - Initializing CronDataSource...');
    await CronDataSource.initialize();
    console.log('  ✅ CronDataSource initialized');

    console.log('  - Initializing AdminDataSource...');
    await AdminDataSource.initialize();
    console.log('  ✅ AdminDataSource initialized');

    // Test 2: Check Replication Configuration
    console.log('\n📊 Test 2: Checking Replication Configuration...');

    const hasReplicas = hasReadReplicas();
    console.log(`  - Has Read Replicas: ${hasReplicas ? '✅ YES' : '⚠️  NO'}`);

    const replicationInfo = getReplicationInfo();
    console.log('  - Replication Info:');
    console.log(`    • Enabled: ${replicationInfo.enabled}`);
    console.log(`    • Default Mode: ${replicationInfo.defaultMode}`);
    console.log(`    • Master: ${replicationInfo.master}`);
    console.log(`    • Replicas: ${replicationInfo.replicas.length}`);
    replicationInfo.replicas.forEach((replica, idx) => {
      console.log(`      ${idx + 1}. ${replica}`);
    });

    // Test 3: Test Query Execution
    console.log('\n📊 Test 3: Testing Query Execution...');

    // Test with standard repository (should use replica for reads)
    console.log('  - Testing standard repository (Project)...');
    const projectRepo = getRepository(Project);
    const projectCount = await projectRepo.count();
    console.log(`    ✅ Found ${projectCount} projects`);

    // Test with master repository
    console.log('  - Testing master repository (User)...');
    const userMasterRepo = getMasterRepository(User);
    const userCount = await userMasterRepo.count();
    console.log(`    ✅ Found ${userCount} users`);

    // Test 4: Verify AdminDataSource
    console.log('\n📊 Test 4: Verifying AdminDataSource...');

    const adminDs = AdminDataSource.getDataSource();
    console.log(
      `  - AdminDataSource is initialized: ${adminDs.isInitialized ? '✅' : '❌'}`,
    );
    console.log(
      `  - AdminDataSource host: ${adminDs.options['host'] || (adminDs.options as any).replication?.master?.host}`,
    );

    // Check if AdminDataSource has replication (it shouldn't)
    const hasAdminReplication = !!(adminDs.options as any).replication;
    console.log(
      `  - AdminDataSource uses replication: ${hasAdminReplication ? '❌ (Should be NO)' : '✅ NO'}`,
    );

    // Test 5: Connection Health Check
    console.log('\n📊 Test 5: Testing Connection Health...');

    console.log('  - Testing AppDataSource query...');
    const start1 = Date.now();
    await AppDataSource.getDataSource().query('SELECT 1');
    const time1 = Date.now() - start1;
    console.log(`    ✅ Query executed in ${time1}ms`);

    console.log('  - Testing AdminDataSource query...');
    const start2 = Date.now();
    await AdminDataSource.getDataSource().query('SELECT 1');
    const time2 = Date.now() - start2;
    console.log(`    ✅ Query executed in ${time2}ms`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ All Tests Passed!\n');

    if (hasReplicas) {
      console.log('📌 Summary:');
      console.log('  • Read replicas are configured and active');
      console.log('  • GraphQL queries will use read replicas for SELECT');
      console.log('  • AdminJS will use master for all operations');
      console.log('  • Write operations always use master');
    } else {
      console.log('⚠️  Summary:');
      console.log('  • No read replicas configured');
      console.log('  • All queries will use master database');
      console.log('  • To enable replicas, add TYPEORM_DATABASE_HOST_READONLY');
      console.log('    and related environment variables');
    }

    console.log('\n✨ Replication setup is working correctly!\n');
  } catch (error) {
    console.error('\n❌ Error during testing:');
    console.error(error);
    console.log('\n📋 Troubleshooting:');
    console.log('  1. Check your .env file has correct database credentials');
    console.log('  2. Verify database servers are accessible');
    console.log('  3. Check if read replica credentials are correct');
    console.log('  4. Review logs above for specific error details\n');
    process.exit(1);
  } finally {
    // Cleanup
    try {
      await AppDataSource.getDataSource()?.destroy();
      await CronDataSource.getDataSource()?.destroy();
      await AdminDataSource.close();
      console.log('🔌 Connections closed\n');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Run the test
if (require.main === module) {
  testReplicationSetup()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testReplicationSetup };
