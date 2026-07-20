import { useCallback, useEffect, useState } from "react";

export const useServiceData = (loader, loaderArgument, initialData) => {
  const [resource, setResource] = useState({
    data: initialData,
    loading: true,
    error: null,
  });
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let active = true;

    loader(loaderArgument)
      .then((data) => {
        if (active) setResource({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (active) {
          setResource((current) => ({ ...current, loading: false, error }));
        }
      });

    return () => {
      active = false;
    };
  }, [loader, loaderArgument, refreshIndex]);

  const reload = useCallback(() => {
    setResource((current) => ({ ...current, loading: true }));
    setRefreshIndex((current) => current + 1);
  }, []);

  return { ...resource, reload };
};
