// frontend/src/components/SupplementList.js
import React, { useEffect, useState } from 'react';
import { fetchSupplements } from '../api';

const SupplementList = () => {
  const [supplements, setSupplements] = useState([]);

  useEffect(() => {
    fetchSupplements()
      .then(response => setSupplements(response.data))
      .catch(error => console.error(error));
  }, []);

  return (
    <div>
      <h1>Supplements</h1>
      <ul>
        {supplements.map(supplement => (
          <li key={supplement.id}>{supplement.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default SupplementList;
