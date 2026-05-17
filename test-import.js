console.log('Starting import test...');

try {
  console.log('1. Importing app...');
  const app = await import('./server-app/app.js');
  console.log('2. App imported successfully');
} catch (e) {
  console.error('Import failed:', e.message);
  console.error('Stack:', e.stack);
}
