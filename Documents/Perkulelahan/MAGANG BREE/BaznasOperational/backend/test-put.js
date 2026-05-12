async function test() {
  try {
    const res = await fetch('http://127.0.0.1:4000/api/proposals');
    const data = await res.json();
    const tasks = data.filter(p => p.status === 'Survei Assessment' || p.status === 'Proses Disposisi');
    
    for (const task of tasks) {
      console.log(`Trying to update task ${task.id} (${task.status})...`);
      
      const putRes = await fetch(`http://127.0.0.1:4000/api/proposals/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          surveyorName: 'Staf_Distribusi'
        })
      });
      
      const putData = await putRes.json();
      if (!putRes.ok) {
        console.error('Error for', task.id, ':', putData);
      } else {
        console.log('Success for', task.id, ':', putRes.status);
      }
    }
  } catch (err) {
    console.error('Network Error:', err.message);
  }
}

test();
