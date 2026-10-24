import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Snowflake } from "lucide-react";
import { Link } from "react-router";

/** Themed 404 page for DhruvaTwin. */
export default function NotFound() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center"
    >
      <div className="flex size-12 items-center justify-center rounded-md border border-primary/40 bg-primary/10">
        <Snowflake className="size-6 text-primary" />
      </div>
      <h1 className="cc-mono mt-6 text-5xl text-foreground">404</h1>
      <p className="mt-2 font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
        Sector not found
      </p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        This coordinate is off the DhruvaTwin grid. Head back to the command centre to
        rejoin live station telemetry.
      </p>
      <Button asChild className="mt-6 cursor-pointer">
        <Link to="/">Return to base</Link>
      </Button>
    </motion.main>
  );
}
