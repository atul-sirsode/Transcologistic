const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testFileUpload() {
  try {
    // Read the test file
    const fileBuffer = fs.readFileSync('test-data.csv');
    
    // Create form data
    const form = new FormData();
    form.append('file', fileBuffer, {
      filename: 'test-data.csv',
      contentType: 'text/csv'
    });
    form.append('same_file_name', 'test-data.csv');
    
    // Send request
    const response = await axios.post('http://localhost:4000/api/file-history', form, {
      headers: {
        ...form.getHeaders()
      }
    });
    
    console.log('Upload successful:', response.data);
    
    // Test getting file history
    const historyResponse = await axios.get('http://localhost:4000/api/file-history');
    console.log('File history:', historyResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testFileUpload();
