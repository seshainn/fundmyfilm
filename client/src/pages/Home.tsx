import { useInfiniteQuery } from "@tanstack/react-query";
import type { QueryFunctionContext } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export type Project = {
  id: number;
  title: string;
  image: string;
  logline: string;
  budget: number;
  amount_collected: number;
};

const fetchProjects = async (
  { pageParam }: QueryFunctionContext
): Promise<Project[]> => {
  const res = await api.get(`/projects?offset=${pageParam}`);
  return res.data;
};

export default function Home() {
  
  const navigate = useNavigate()

  const {
    data,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    initialPageParam: 0, 
    getNextPageParam: (lastPage, pages) =>
      lastPage.length ? pages.length * 2 : undefined,
  });

  return (
    <div className="p-6 space-y-6">
      {data?.pages.map((page) =>
        page.map((proj) => (
          <div
            key={proj.id}
            className="flex bg-white shadow rounded overflow-hidden"
          >
            {/* Left */}
            <img src={proj.image} className="w-1/3 object-cover" />

            {/* Right */}
            <div className="p-4 flex flex-col justify-between w-2/3">
              <div>
                <h2 className="text-xl font-bold">{proj.title}</h2>
                <p>{proj.logline}</p>
                <p>₹ {proj.amount_collected} / {proj.budget}</p>
              </div>

              <Button 
                onClick={() => navigate("/payment", { state: { project: proj } })}
                className="bg-teal-500 text-white px-4 py-2 rounded mt-2"
              >
                Contribute
              </Button>
            </div>
          </div>
        ))
      )}

      {hasNextPage && (
        <Button
          onClick={() => fetchNextPage()}
          className="bg-orange-500 text-white px-4 py-2"
        >
          Load More
        </Button>
      )}
    </div>
  );
}