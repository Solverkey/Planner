import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import MyTasksView from "@/components/my-tasks/my-tasks-view";
import PageTitle from "@/components/page-title";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/my-tasks",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { workspaceId } = Route.useParams();
  const title = t("tasks:myTasks.pageTitle");

  return (
    <>
      <PageTitle title={title} />
      <WorkspaceLayout title={title}>
        <MyTasksView workspaceId={workspaceId} />
      </WorkspaceLayout>
    </>
  );
}
