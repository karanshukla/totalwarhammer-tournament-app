# Environment Configuration

This project uses environment-specific configuration files to manage different settings across development, test, and production environments.

## Structure

The configuration system is organized as follows:

- `env.js`: Main entry point that loads the appropriate environment configuration
- `environments/`: Directory containing environment-specific configurations:
  - `development.js`: Development environment settings
  - `test.js`: Test environment settings (used in CI and local tests)
  - `production.js`: Production environment settings

## Usage

The system automatically selects the appropriate configuration based on the `NODE_ENV` environment variable:

- When `NODE_ENV=development` (default if not specified), development configuration is used
- When `NODE_ENV=test`, test configuration is used
- When `NODE_ENV=production`, production configuration is used

## Extending

To add new configuration values:

1. Add the value to all environment files in the `environments/` directory
2. Export the value in `env.js`
3. Import and use wherever needed in the application

## Environment Variables

You can still override any configuration using environment variables either through:

- `.env` file in the project root
- Setting environment variables in your CI/CD system
- Setting environment variables in your deployment platform

## Test Environment

The test environment configuration contains default values for running tests without requiring additional setup, making CI and local testing easier.
