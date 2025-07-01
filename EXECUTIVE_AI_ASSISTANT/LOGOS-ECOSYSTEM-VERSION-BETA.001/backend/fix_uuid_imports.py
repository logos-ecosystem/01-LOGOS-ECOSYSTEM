#!/usr/bin/env python3
"""Fix UUID imports for SQLite compatibility."""

import os
import re

def fix_uuid_imports(file_path):
    """Fix UUID imports in a single file."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Skip if it's the database_types.py file itself
    if file_path.endswith('database_types.py'):
        return False
    
    # Check if file needs fixing
    if 'from sqlalchemy.dialects.postgresql import UUID' not in content and \
       'Column(UUID' not in content:
        return False
    
    original_content = content
    
    # Replace PostgreSQL UUID import with our custom UUID
    content = re.sub(
        r'from sqlalchemy\.dialects\.postgresql import UUID\b',
        'from ...shared.utils.database_types import UUID',
        content
    )
    
    # Handle imports that include other items
    content = re.sub(
        r'from sqlalchemy\.dialects\.postgresql import (.*?)UUID(.*?)(?=\n)',
        lambda m: f'from sqlalchemy.dialects.postgresql import {m.group(1).strip().rstrip(",").strip()}{m.group(2).strip().rstrip(",").strip()}'.strip().rstrip(',') + '\nfrom ...shared.utils.database_types import UUID' if m.group(1).strip() or m.group(2).strip() else 'from ...shared.utils.database_types import UUID',
        content
    )
    
    # Fix UUID as PGUUID imports
    content = re.sub(
        r'from sqlalchemy\.dialects\.postgresql import UUID as PGUUID',
        'from ...shared.utils.database_types import UUID',
        content
    )
    
    # Clean up any double imports or empty imports
    content = re.sub(r'from sqlalchemy\.dialects\.postgresql import\s*\n', '', content)
    content = re.sub(r'from sqlalchemy\.dialects\.postgresql import\s*,', 'from sqlalchemy.dialects.postgresql import', content)
    
    # Remove (as_uuid=True) from Column definitions since our UUID handles this
    content = re.sub(r'Column\(UUID\(as_uuid=True\)', 'Column(UUID', content)
    
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Fixed: {file_path}")
        return True
    
    return False

def main():
    """Fix UUID imports in all model files."""
    models_dir = '/home/fran/claude-projects/LOGOS_ECOSYSTEM/ECOSYSTEM/src/shared/models'
    
    fixed_count = 0
    for root, dirs, files in os.walk(models_dir):
        for file in files:
            if file.endswith('.py') and file != '__pycache__':
                file_path = os.path.join(root, file)
                if fix_uuid_imports(file_path):
                    fixed_count += 1
    
    print(f"\nFixed {fixed_count} files")

if __name__ == '__main__':
    main()