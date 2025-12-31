import { useQuery } from "@tanstack/react-query";
import { API_URL } from "./api";

const url = `${API_URL}/markets`;




export function useGetMarkets(limit: number = 50) {
    return useQuery({
        queryKey: ["markets", limit],
        queryFn: () =>
            fetch(`${url}?limit=${limit}`).then((res) => res.json()),

        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
    });
}
