import { useEffect, useState } from "react";

export const useServiceData = (loader, loaderArgument, initialData) => {
  const [resource, setResource] = useState({
    data: initialData,
    loading: true,
    error: null,
  });

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
  }, [loader, loaderArgument]);

  return resource;
};
