import { exec } from 'child_process';

export const getVersion = () => {
  return new Promise((resolve, reject) => {
    exec('git describe --tags --abbrev=0', (err, stdout, stderr) => {
      if (err) {
        console.error('Error fetching the version:', stderr);
        reject(err); 
        return;
      }
      resolve(stdout.trim()); 
    });
  });
};
