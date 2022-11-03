import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { ProductList } from "../pages/Home/styles";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const localStorageKey = "@RocketShoes:cart";

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(localStorageKey);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock[]>(`/stock`);
      const productStock = stock.find((item) => item.id === productId);
      const productExist = cart.find((product) => product.id === productId);

      if (!productStock) {
        toast.error("Produto não consta no estoque");
        return;
      }

      if (!productExist) {
        const { data: product } = await api.get<Product>(
          `/products/${productId}`
        );
        const newListCart = [...cart, { ...product, amount: 1 }];

        localStorage.setItem(localStorageKey, JSON.stringify(newListCart));
        setCart(newListCart);
        return;
      }

      if (productExist.amount >= productStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newListCart = cart.map((product) => {
        if (product.id === productExist.id) {
          return {
            ...product,
            amount: product.amount + 1,
          };
        }
        return product;
      });

      localStorage.setItem(localStorageKey, JSON.stringify(newListCart));
      setCart(newListCart);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter((product) => product.id !== productId);
      setCart(newCart);
      localStorage.setItem(localStorageKey, JSON.stringify(newCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: stock } = await api.get<Stock[]>(`/stock`);
      const productStock = stock.find((item) => item.id === productId);

      if (productStock && amount >= productStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = [...cart];

      const newListCart = newCart.map((product) => {
        if (product.id === productId) {
          product.amount = amount;
        }
        return product;
      });

      localStorage.setItem(localStorageKey, JSON.stringify(newListCart));
      setCart(newListCart);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
