import { motion } from "framer-motion";

export const FadeUp = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    {children}
  </motion.div>
);

export const HoverCard = ({ children, className }) => (
  <motion.div
    whileHover={{
      scale: 1.03,
      y: -4,
      boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
    }}
    transition={{ type: "spring", stiffness: 250 }}
    className={className}
  >
    {children}
  </motion.div>
);
