#!/bin/bash
echo "🚀 Starting Hugo dev server with live reload..."
hugo server --disableFastRender --destination ../dist --watch --source . --baseURL http://localhost:1313/
