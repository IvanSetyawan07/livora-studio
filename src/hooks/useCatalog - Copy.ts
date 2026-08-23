import { useEffect, useState } from "react";
import {
  getAllCatalogs
} from "@/lib/catalogApi";

export const useCatalog = () => {
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCatalogs = async () => {
    try {
      setLoading(true);

      const response =
        await getAllCatalogs();

      setCatalogs(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogs();
  }, []);

  return {
    catalogs,
    loading,
    refetch: fetchCatalogs,
  };
};