import { useInfiniteQuery } from "@tanstack/react-query";
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

const PAGE_SIZE = 2;

const fetchProjects = async (offset: number): Promise<Project[]> => {
  const res = await api.get(`/projects?offset=${offset}&limit=${PAGE_SIZE}`);
  return res.data;
};

export default function Home() {
  const navigate = useNavigate();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ["projects"],
    queryFn: ({ pageParam = 0 }) => fetchProjects(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE
  });

  if (isLoading) {
    return <div className="p-6">Loading projects...</div>;
  }

  if (isError) {
    return <div className="p-6 text-red-500">Failed to load projects.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {data?.pages.map((page) =>
        page.map((proj) => (
          <div
            key={proj.id}
            className="flex bg-white dark:bg-gray-800 shadow rounded overflow-hidden"
          >
            <img
              src={proj.image}
              alt={proj.title}
              className="w-1/3 object-cover"
            />

            <div className="p-4 flex flex-col justify-between w-2/3">
              <div>
                <h2 className="text-xl font-bold">{proj.title}</h2>
                <p>{proj.logline}</p>
                <p>
                  ₹ {Number(proj.amount_collected).toLocaleString()} /{" "}
                  {Number(proj.budget).toLocaleString()}
                </p>
              </div>

              <Button
                onClick={() =>
                  navigate("/payment", {
                    state: {
                      project: proj
                    }
                  })
                }
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