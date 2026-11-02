#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# OmniStudy AI — IndicTrans2 Translation Service Setup
# ──────────────────────────────────────────────────────────────────────────────
#
# This script sets up the Python virtual environment and installs all
# dependencies needed for the IndicTrans2 translation service.
#
# Prerequisites:
#   - Python 3.9+ installed
#   - pip available
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh
#
# After setup, start the service with:
#   source venv/bin/activate
#   python app.py
# ──────────────────────────────────────────────────────────────────────────────

set -e

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  OmniStudy AI — Translation Service Setup"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check Python version
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ ERROR: Python 3.9+ is required but not found."
    echo "   Install Python from https://www.python.org/downloads/"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
echo "✓ Found Python: $PYTHON_VERSION"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo ""
    echo "→ Creating virtual environment..."
    $PYTHON_CMD -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

# Activate
source venv/bin/activate
echo "✓ Virtual environment activated"

# Upgrade pip
echo ""
echo "→ Upgrading pip..."
pip install --upgrade pip -q

# Install dependencies
echo ""
echo "→ Installing dependencies (this may take a few minutes)..."
pip install -r requirements.txt -q

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Setup Complete!"
echo ""
echo "  To start the translation service:"
echo ""
echo "    source venv/bin/activate"
echo "    python app.py"
echo ""
echo "  The service will run on http://localhost:8000"
echo "  First startup will download the IndicTrans2 model (~800MB)"
echo "════════════════════════════════════════════════════════════"
echo ""
