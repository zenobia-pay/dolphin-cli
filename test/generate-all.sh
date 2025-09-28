#!/bin/bash

echo "🔄 Regenerating all test examples..."

# Build the CLI first
echo "📦 Building CLI..."
cd .. && npm run build && cd test

# Create examples directory
mkdir -p examples
cd examples

# 1. Basic init
echo "🚀 Generating basic-init example..."
rm -rf basic-init
mkdir basic-init && cd basic-init
node ../../../dist/cli.js init . --yes
cd ..

# 2. Init + pricing
echo "💰 Generating init-plus-pricing example..."
rm -rf init-plus-pricing  
mkdir init-plus-pricing && cd init-plus-pricing
node ../../../dist/cli.js init . --yes
node ../../../dist/cli.js pricing --yes
cd ..

# 3. Init + AI assistant
echo "🤖 Generating init-plus-ai example..."
rm -rf init-plus-ai
mkdir init-plus-ai && cd init-plus-ai  
node ../../../dist/cli.js init . --yes
node ../../../dist/cli.js ai-assistant --yes
cd ..

# 4. Init + pages
echo "📄 Generating init-plus-pages example..."
rm -rf init-plus-pages
mkdir init-plus-pages && cd init-plus-pages
node ../../../dist/cli.js init . --yes
node ../../../dist/cli.js create-page about --type static --yes
node ../../../dist/cli.js create-page contact --type static --yes
node ../../../dist/cli.js create-page analytics --type dashboard --yes
node ../../../dist/cli.js create-page inventory --type dashboard --yes
cd ..

# 5. Full example (everything)
echo "🎯 Generating full-example..."
rm -rf full-example
mkdir full-example && cd full-example
node ../../../dist/cli.js init . --yes
node ../../../dist/cli.js pricing --yes
node ../../../dist/cli.js ai-assistant --yes
node ../../../dist/cli.js create-page about --type static --yes
node ../../../dist/cli.js create-page pricing --type static --yes
node ../../../dist/cli.js create-page analytics --type dashboard --yes
node ../../../dist/cli.js create-page support --type dashboard --yes
cd ..

echo "✅ All examples generated! Check the examples/ directory."
echo ""
echo "To test an example:"
echo "cd examples/basic-init && npm install && npm run dev"