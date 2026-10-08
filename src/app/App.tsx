import { Tooltip } from "@base-ui/react/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { FlowPage } from "./FlowPage";
import { Home } from "./Home";

const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: 0, refetchOnWindowFocus: false, retry: false } }
});

const router = createBrowserRouter([
	{ path: "/", element: <Home /> },
	{ path: "/f/:id", element: <FlowPage /> },
	{ path: "*", element: <Navigate to="/" replace /> }
]);

export function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<Tooltip.Provider delay={500} closeDelay={0}>
				<RouterProvider router={router} />
			</Tooltip.Provider>
		</QueryClientProvider>
	);
}
