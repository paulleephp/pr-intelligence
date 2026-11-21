export function isBinaryFile(patch: string): boolean {
     // Remove comments from the patch content
     const cleanedPatch = patch.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*\n/g, '');

     // Check if the file extension is null or not provided
     if (!patch.includes('.')) {
       return true;
     }

     // Detect binary files based on byte patterns and content
     const regex = /[^\x20-\x7E]/g; // Regex to match non-printable characters

     let hasNonPrintableChar = false;
     for (let i = 0; i < cleanedPatch.length; i++) {
       if (cleanedPatch[i].match(regex)) {
         hasNonPrintableChar = true;
         break; // Exit early if a non-printable character is found
       }
     }

     return hasNonPrintableChar || cleanedPatch.includes('\0'); // Check for null bytes
   }