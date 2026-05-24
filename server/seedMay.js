async function seedFunds() {
  const months = [1, 2, 3, 4, 5];
  const year = 2026;
  const targetAmount = 500; // default amount
  const name = 'Monthly Maintenance Fund';

  for (const month of months) {
    try {
      const res = await fetch('http://localhost:5000/api/funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          targetAmount: targetAmount,
          fundType: 'Monthly',
          year: year,
          month: month
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`Created fund for ${month}/${year}`);
      } else {
        console.error(`Failed to create fund for ${month}/${year}:`, data.error || data);
      }
    } catch (e) {
      console.error(`Error creating fund for ${month}/${year}:`, e.message);
    }
  }
}
seedFunds();
