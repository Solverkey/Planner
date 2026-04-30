import { createFileRoute } from "@tanstack/react-router";
import WorkspaceLayout from "@/components/common/workspace-layout";
import MyTasksView from "@/components/my-tasks/my-tasks-view";
import PageTitle from "@/components/page-title";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/my-tasks",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { workspaceId } = Route.useParams();

  return (
    <>
      <PageTitle title="My tasks" />
      <WorkspaceLayout title="My tasks">
        <MyTasksView workspaceId={workspaceId} />
      </WorkspaceLayout>
    </>
  );
}
