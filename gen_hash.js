const bcrypt = require('bcrypt');

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  console.log('\n✅ Bcrypt hash of password123:');
  console.log(hash);
  console.log('\nCopy this hash and paste it into the MongoDB Atlas password field.\n');
}

main();
