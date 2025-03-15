import { useState, useEffect } from 'react';

export default function CalculadoraSimples() {
  const [valorTotal, setValorTotal] = useState<string>('');
  const [valorPago, setValorPago] = useState<string>('');
  const [desconto, setDesconto] = useState<string>('0');
  const [valorEconomizado, setValorEconomizado] = useState<string>('R$ 0.00');

  // Efeito para recalcular quando os valores mudarem
  useEffect(() => {
    if (valorTotal && valorPago) {
      const total = parseFloat(valorTotal);
      const pago = parseFloat(valorPago);
      
      if (total > 0 && pago >= 0 && pago < total) {
        // Calcula o percentual de desconto
        const descontoCalculado = ((total - pago) / total) * 100;
        setDesconto(descontoCalculado.toFixed(2));
        
        // Calcula o valor economizado
        const economizado = total - pago;
        setValorEconomizado(`R$ ${economizado.toFixed(2)}`);
      } else {
        setDesconto('0');
        setValorEconomizado('R$ 0.00');
      }
    } else {
      setDesconto('0');
      setValorEconomizado('R$ 0.00');
    }
  }, [valorTotal, valorPago]);

  return (
    <div className="p-8 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Calculadora de Desconto</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor Total do Gift Card
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: 100.00"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor Pago
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={valorPago}
            onChange={(e) => setValorPago(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: 90.00"
          />
        </div>
        
        <div className="pt-4 border-t">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Desconto:</span>
            <span className="text-lg font-semibold text-green-600">{desconto}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Você economizou:</span>
            <span className="text-lg font-semibold text-green-600">{valorEconomizado}</span>
          </div>
        </div>
      </div>
    </div>
  );
}