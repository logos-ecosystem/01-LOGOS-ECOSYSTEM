import React from 'react';
import { Box, TextField } from '@mui/material';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string | number;
}

export default function CodeEditor({
  value,
  onChange,
  language = 'javascript',
  placeholder,
  readOnly = false,
  minHeight = 300
}: CodeEditorProps) {
  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        multiline
        fullWidth
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        InputProps={{
          readOnly,
          sx: {
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: '14px',
            lineHeight: 1.5,
            minHeight,
            '& textarea': {
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit'
            }
          }
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#f5f5f5',
            '&:hover': {
              backgroundColor: '#f0f0f0'
            },
            '&.Mui-focused': {
              backgroundColor: '#fff'
            }
          }
        }}
      />
    </Box>
  );
}