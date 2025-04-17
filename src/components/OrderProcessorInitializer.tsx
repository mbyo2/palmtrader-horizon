
import { useOrderProcessor } from '../hooks/useOrderProcessor';

const OrderProcessorInitializer = () => {
  useOrderProcessor();
  return null;
};

export default OrderProcessorInitializer;
