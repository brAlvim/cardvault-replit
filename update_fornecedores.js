// Script para atualizar todos os fornecedores existentes
// adicionando empresaId aos fornecedores existentes

// Obter todos os fornecedores
const token = localStorage.getItem('authToken');
const options = {
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

// Obter todos os fornecedores
fetch('/api/fornecedores', options)
  .then(response => response.json())
  .then(fornecedores => {
    console.log('Fornecedores encontrados:', fornecedores.length);
    
    // Para cada fornecedor, atualizar adicionando empresaId = 1 (padrão)
    const promises = fornecedores.map(fornecedor => {
      const updatedFornecedor = {
        ...fornecedor,
        empresaId: 1 // Usar a empresa padrão para todos
      };
      
      return fetch(`/api/fornecedores/${fornecedor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedFornecedor)
      });
    });
    
    // Aguardar todas as atualizações serem concluídas
    return Promise.all(promises);
  })
  .then(() => {
    console.log('Todos os fornecedores foram atualizados com sucesso!');
  })
  .catch(error => {
    console.error('Erro ao atualizar fornecedores:', error);
  });