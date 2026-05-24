async function test() {
  try {
    const p1 = await fetch('http://localhost:5000/api/funds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'DUPLICATE TEST',
        targetAmount: 100,
        fundType: 'Monthly',
        year: 2026,
        month: 5
      })
    });
    const d1 = await p1.json();
    console.log('p1 success', d1.fund?._id, d1.error);

    const p2 = await fetch('http://localhost:5000/api/funds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'DUPLICATE TEST',
        targetAmount: 200,
        fundType: 'Monthly',
        year: 2026,
        month: 6
      })
    });
    const d2 = await p2.json();
    console.log('p2 success', d2.fund?._id, d2.error);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
test();
