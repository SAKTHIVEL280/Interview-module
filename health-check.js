#!/usr/bin/env node

/**
 * Health Check Script for Interview Module
 * This script verifies that all components are working correctly
 */

const http = require('http');

// Configuration
const BACKEND_PORT = 5000;
const FRONTEND_PORT = 8081;
const TEST_PROJECT_ID = '3000609';

// Helper function to make HTTP requests
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data.startsWith('{') ? JSON.parse(data) : data;
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Tests
async function runHealthChecks() {
  console.log('🔍 Starting Health Checks for Interview Module...\n');
  
  const results = [];
  
  // Test 1: Backend Server Health
  try {
    console.log('1. Testing Backend Server Health...');
    const healthResponse = await makeRequest({
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: '/api/health',
      method: 'GET'
    });
    
    if (healthResponse.status === 200) {
      console.log('   ✅ Backend server is running and healthy');
      results.push({ test: 'Backend Health', status: 'PASS' });
    } else {
      console.log(`   ❌ Backend health check failed: ${healthResponse.status}`);
      results.push({ test: 'Backend Health', status: 'FAIL', error: `Status ${healthResponse.status}` });
    }
  } catch (error) {
    console.log(`   ❌ Backend server is not accessible: ${error.message}`);
    results.push({ test: 'Backend Health', status: 'FAIL', error: error.message });
  }
  
  // Test 2: Project API Endpoint
  try {
    console.log('2. Testing Project API Endpoint...');
    const projectResponse = await makeRequest({
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: `/api/project/${TEST_PROJECT_ID}`,
      method: 'GET'
    });
    
    if (projectResponse.status === 200 && projectResponse.data.success) {
      console.log('   ✅ Project API is working correctly');
      console.log(`   📊 Project: ${projectResponse.data.data.programName}`);
      console.log(`   🏢 Company: ${projectResponse.data.data.accountName}`);
      results.push({ test: 'Project API', status: 'PASS' });
    } else {
      console.log(`   ❌ Project API failed: ${projectResponse.status}`);
      results.push({ test: 'Project API', status: 'FAIL', error: `Status ${projectResponse.status}` });
    }
  } catch (error) {
    console.log(`   ❌ Project API is not accessible: ${error.message}`);
    results.push({ test: 'Project API', status: 'FAIL', error: error.message });
  }
  
  // Test 3: Frontend Server
  try {
    console.log('3. Testing Frontend Server...');
    const frontendResponse = await makeRequest({
      hostname: 'localhost',
      port: FRONTEND_PORT,
      path: '/',
      method: 'GET'
    });
    
    if (frontendResponse.status === 200) {
      console.log('   ✅ Frontend server is running');
      results.push({ test: 'Frontend Server', status: 'PASS' });
    } else {
      console.log(`   ❌ Frontend server failed: ${frontendResponse.status}`);
      results.push({ test: 'Frontend Server', status: 'FAIL', error: `Status ${frontendResponse.status}` });
    }
  } catch (error) {
    console.log(`   ❌ Frontend server is not accessible: ${error.message}`);
    results.push({ test: 'Frontend Server', status: 'FAIL', error: error.message });
  }
  
  // Test 4: CORS Configuration
  try {
    console.log('4. Testing CORS Configuration...');
    const corsResponse = await makeRequest({
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: '/api/health',
      method: 'OPTIONS'
    });
    
    const corsHeaders = corsResponse.headers['access-control-allow-origin'] || 
                       corsResponse.headers['Access-Control-Allow-Origin'];
    
    if (corsHeaders) {
      console.log('   ✅ CORS is properly configured');
      results.push({ test: 'CORS Configuration', status: 'PASS' });
    } else {
      console.log('   ⚠️  CORS headers not found (may still work)');
      results.push({ test: 'CORS Configuration', status: 'WARNING', error: 'No CORS headers' });
    }
  } catch (error) {
    console.log(`   ❌ CORS test failed: ${error.message}`);
    results.push({ test: 'CORS Configuration', status: 'FAIL', error: error.message });
  }
  
  // Summary
  console.log('\n📋 Health Check Summary:');
  console.log('=' + '='.repeat(50));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARNING').length;
  
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${icon} ${result.test}: ${result.status}${result.error ? ` (${result.error})` : ''}`);
  });
  
  console.log('\n📊 Results:');
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Warnings: ${warnings}`);
  
  if (failed === 0) {
    console.log('\n🎉 All critical tests passed! Your application should be working correctly.');
    console.log(`\n🌐 Access your application at: http://localhost:${FRONTEND_PORT}`);
    console.log(`📡 Backend API available at: http://localhost:${BACKEND_PORT}`);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above and fix them.');
  }
  
  console.log('\n' + '='.repeat(60));
}

// Run the health checks
runHealthChecks().catch(console.error);
