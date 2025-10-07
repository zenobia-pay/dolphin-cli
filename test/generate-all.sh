#!/bin/bash

# Exit on error
set -e

echo "🧪 Running all test generators..."

# Get the absolute path to the CLI
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_PATH="$SCRIPT_DIR/../dist/cli.js"

# Build the CLI first
echo "📦 Building CLI..."
cd "$SCRIPT_DIR/.."
npm run build
cd "$SCRIPT_DIR"

# Create examples directory if it doesn't exist
mkdir -p examples

# Test 1: Init only
echo ""
echo "📦 Test 1: Init only"
rm -rf examples/init-only
mkdir -p examples/init-only
cd examples/init-only
node "$CLI_PATH" init --yes
cd "$SCRIPT_DIR"

# Test 2: Init + pages
echo ""
echo "📦 Test 2: Init + pages"
rm -rf examples/init-plus-pages
mkdir -p examples/init-plus-pages
cd examples/init-plus-pages
node "$CLI_PATH" init --yes
node "$CLI_PATH" create-page inventory --type dashboard --yes
node "$CLI_PATH" create-page analytics --type dashboard --yes
cd "$SCRIPT_DIR"

# Test 3: Static pages
echo ""
echo "📦 Test 3: Static pages"
rm -rf examples/static-pages
mkdir -p examples/static-pages
cd examples/static-pages
node "$CLI_PATH" init --yes
node "$CLI_PATH" create-page about --type static --yes
node "$CLI_PATH" create-page pricing --type static --yes
cd "$SCRIPT_DIR"

# Test 4: Full example
echo ""
echo "📦 Test 4: Full example"
rm -rf examples/full-example
mkdir -p examples/full-example
cd examples/full-example
node "$CLI_PATH" init --yes
node "$CLI_PATH" create-page support --type dashboard --yes
node "$CLI_PATH" create-page analytics --type dashboard --yes
cd "$SCRIPT_DIR"

echo ""
echo "✅ All test examples generated successfully!"
