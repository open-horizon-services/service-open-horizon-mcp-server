/**
 * Test script for Open Horizon MCP Server
 * 
 * This script starts the server and provides a simple interface to test it.
 */

const { spawn } = require('child_process');
const readline = require('readline');

// Start the server
console.log('Starting Open Horizon MCP Server...');
const server = spawn('npx', ['ts-node', 'src/server.ts'], {
  cwd: __dirname,
  env: {
    ...process.env,
    PORT: '3000',
    EXCHANGE_URL: process.env.EXCHANGE_URL || 'https://exchange.example.com/v1',
    EXCHANGE_ORG: process.env.EXCHANGE_ORG || 'myorg',
    EXCHANGE_CREDENTIAL: process.env.EXCHANGE_CREDENTIAL || 'user:password'
  }
});

// Handle server output
server.stdout.on('data', (data) => {
  console.log(`Server: ${data.toString().trim()}`);
});

server.stderr.on('data', (data) => {
  console.error(`Server Error: ${data.toString().trim()}`);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\nOpen Horizon MCP Server is running on http://localhost:3000');
console.log('You can now use the MCP client to interact with the server.');
console.log('\nPress Ctrl+C to stop the server.');

// Handle user input
rl.on('line', (input) => {
  if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
    console.log('Stopping server...');
    server.kill();
    rl.close();
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nStopping server...');
  server.kill();
  rl.close();
});

// Display environment variables
console.log('\nEnvironment Variables:');
console.log(`EXCHANGE_URL: ${process.env.EXCHANGE_URL || 'https://exchange.example.com/v1'}`);
console.log(`EXCHANGE_ORG: ${process.env.EXCHANGE_ORG || 'myorg'}`);
console.log(`EXCHANGE_CREDENTIAL: ${process.env.EXCHANGE_CREDENTIAL ? '******' : 'Not set'}`);

// Made with Bob
