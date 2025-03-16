import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Função para recuperar o token JWT do localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

// Função para configurar os headers com o token de autenticação
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    try {
      // Tentar fazer parse do JSON
      const errorData = JSON.parse(text);
      throw new Error(errorData.message || `${res.status}: ${res.statusText}`);
    } catch (e) {
      // Se não for JSON, usar o texto como está
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: any,
  customHeaders?: HeadersInit
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...customHeaders
  };
  
  const options: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }
  
  try {
    console.log(`Fazendo requisição ${method} para ${url}`, data);
    const response = await fetch(url, options);
    
    // Se a resposta não for OK (200-299), verificamos o conteúdo
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      console.error('Resposta com erro:', {
        status: response.status,
        statusText: response.statusText,
        contentType
      });
      
      if (contentType && contentType.includes('text/html')) {
        // Se for HTML, vamos registrar para debug
        const htmlText = await response.clone().text();
        console.error('Resposta HTML recebida ao invés de JSON:', htmlText.substring(0, 200) + '...');
      }
    } else {
      console.log(`Resposta OK ${method} ${url}:`, response.status);
    }
    
    return response;
  } catch (error) {
    console.error('Erro na requisição API:', error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const token = getAuthToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      console.log(`Query GET para ${url}`);
      const res = await fetch(url, {
        headers,
        credentials: "include",
      });
      
      console.log(`Resposta para GET ${url}:`, res.status, res.statusText);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log("Requisição não autorizada, retornando null");
        return null;
      }
      
      // Se a resposta não for OK, verificar o conteúdo
      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        console.error('Erro na consulta:', {
          url,
          status: res.status,
          statusText: res.statusText,
          contentType
        });
        
        if (contentType && contentType.includes('text/html')) {
          // Se for HTML, vamos registrar para debug
          const htmlText = await res.clone().text();
          console.error('Resposta HTML recebida ao invés de JSON:', htmlText.substring(0, 200) + '...');
        }
      }

      await throwIfResNotOk(res);
      
      // Verificar se a resposta é um JSON válido
      try {
        const responseText = await res.clone().text();
        
        // Verificar se o texto não está vazio
        if (responseText.trim() === '') {
          console.warn(`Resposta vazia do servidor para ${url}`);
          return null;
        }
        
        // Verificar se o texto é um JSON válido
        try {
          JSON.parse(responseText);
        } catch (e) {
          console.error(`Resposta do servidor não é um JSON válido para ${url}:`, responseText);
          throw new Error('A resposta do servidor não é um JSON válido');
        }
        
        const data = await res.json();
        console.log(`Dados recebidos para ${url}:`, data);
        return data;
      } catch (error) {
        console.error(`Erro ao processar JSON para ${url}:`, error);
        throw error;
      }
    } catch (error) {
      console.error(`Erro na requisição para ${url}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
