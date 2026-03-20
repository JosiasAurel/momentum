"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

type Props = {
  initialName: string;
  initialEmail: string;
  initialUsername: string;
  initialIsProfilePublic: boolean;
};

const TASK_STATUS = ["todo", "in_progress", "stalling", "done"] as const;

export function DashboardShell({ initialName, initialEmail, initialUsername, initialIsProfilePublic }: Props) {
  const utils = trpc.useUtils();

  const meQuery = trpc.profile.me.useQuery(undefined, { retry: false });
  const folderQuery = trpc.folder.list.useQuery();
  const dashboardQuery = trpc.task.dashboard.useQuery();

  const folders = folderQuery.data ?? [];
  const selectedFolder = folders[0]?.id;
  const projectQuery = trpc.project.listByFolder.useQuery(
    { folderId: selectedFolder ?? "" },
    { enabled: Boolean(selectedFolder) },
  );

  const projects = projectQuery.data ?? [];
  const selectedProject = projects[0]?.id;
  const taskQuery = trpc.task.listByProject.useQuery(
    { projectId: selectedProject ?? "" },
    { enabled: Boolean(selectedProject) },
  );

  const [profileName, setProfileName] = useState(initialName);
  const [profileUsername, setProfileUsername] = useState(initialUsername);
  const [isProfilePublic, setIsProfilePublic] = useState(initialIsProfilePublic);
  const [folderName, setFolderName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");

  useEffect(() => {
    if (!profileUsername && meQuery.data?.username) {
      setProfileUsername(meQuery.data.username);
    }
  }, [meQuery.data?.username, profileUsername]);

  useEffect(() => {
    if (typeof meQuery.data?.isProfilePublic === "boolean") {
      setIsProfilePublic(meQuery.data.isProfilePublic);
    }
  }, [meQuery.data?.isProfilePublic]);

  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: (payload) => {
      setProfileName(payload.name);
      setProfileUsername(payload.username ?? "");
      setIsProfilePublic(payload.isProfilePublic);
      void utils.profile.me.invalidate();
    },
  });

  const createFolder = trpc.folder.create.useMutation({
    onSuccess: () => {
      setFolderName("");
      void folderQuery.refetch();
    },
  });

  const createProject = trpc.project.create.useMutation({
    onSuccess: () => {
      setProjectName("");
      void projectQuery.refetch();
    },
  });

  const removeFolder = trpc.folder.remove.useMutation({
    onSuccess: () => {
      void folderQuery.refetch();
      void projectQuery.refetch();
      void taskQuery.refetch();
      void dashboardQuery.refetch();
    },
  });

  const removeProject = trpc.project.remove.useMutation({
    onSuccess: () => {
      void projectQuery.refetch();
      void taskQuery.refetch();
      void dashboardQuery.refetch();
    },
  });

  const createTask = trpc.task.create.useMutation({
    onSuccess: () => {
      setTaskTitle("");
      setTaskDescription("");
      setTaskDueAt("");
      void taskQuery.refetch();
      void dashboardQuery.refetch();
    },
  });

  const removeTask = trpc.task.remove.useMutation({
    onSuccess: () => {
      void taskQuery.refetch();
      void dashboardQuery.refetch();
    },
  });

  const setTaskStatus = trpc.task.setStatus.useMutation({
    onSuccess: () => {
      void taskQuery.refetch();
      void dashboardQuery.refetch();
    },
  });

  const setActiveTask = trpc.task.setActive.useMutation({
    onSuccess: () => {
      void taskQuery.refetch();
      void dashboardQuery.refetch();
    },
  });

  const statusCards = useMemo(() => {
    const counts = dashboardQuery.data?.statusCounts;

    return [
      { label: "Pending", value: counts ? counts.todo : 0 },
      { label: "In progress", value: counts ? counts.in_progress : 0 },
      { label: "Stalling", value: counts ? counts.stalling : 0 },
      { label: "Completed", value: counts ? counts.done : 0 },
    ];
  }, [dashboardQuery.data?.statusCounts]);

  if (meQuery.isLoading || folderQuery.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Workspace dashboard</h1>
          <p className="text-sm text-muted-foreground">{meQuery.data?.email ?? initialEmail}</p>
        </div>
        <form action="/api/auth/sign-out" method="post">
          <Button type="submit" variant="outline">Sign out</Button>
        </form>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statusCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Set your display name and unique public username.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={profileName} onChange={(event) => setProfileName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={profileUsername}
                onChange={(event) => setProfileUsername(event.target.value.toLowerCase())}
                placeholder="your_handle"
              />
            </div>
            <div className="rounded-lg border bg-secondary/20 p-3">
              <div className="flex items-start gap-3">
                <input
                  id="is-profile-public"
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  checked={isProfilePublic}
                  onChange={(event) => setIsProfilePublic(event.target.checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="is-profile-public" className="text-sm font-medium">
                    Make profile public
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Visitors can view your public stats at {profileUsername ? `/${profileUsername}` : "/:username"}.
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() =>
                updateProfile.mutate({
                  name: profileName,
                  username: profileUsername,
                  isProfilePublic,
                })
              }
              disabled={updateProfile.isPending}
            >
              Save profile
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Folders</CardTitle>
            <CardDescription>Create folders to group projects.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Frontend roadmap" />
              <Button onClick={() => createFolder.mutate({ name: folderName })} disabled={!folderName.trim() || createFolder.isPending}>Add</Button>
            </div>
            <ul className="space-y-2 text-sm">
              {folders.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <span>{item.name}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeFolder.mutate({ id: item.id })}>Delete</Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Projects belong to your first folder for now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Build dashboard" />
              <Button
                onClick={() => selectedFolder && createProject.mutate({ folderId: selectedFolder, name: projectName })}
                disabled={!selectedFolder || !projectName.trim() || createProject.isPending}
              >
                Add
              </Button>
            </div>
            <ul className="space-y-2 text-sm">
              {projects.map((item) => (
                <li key={item.id} className="rounded-md border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{item.name}</div>
                    <Button size="sm" variant="ghost" onClick={() => removeProject.mutate({ id: item.id })}>Delete</Button>
                  </div>
                  {item.description ? <p className="text-muted-foreground">{item.description}</p> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create task</CardTitle>
            <CardDescription>Description must be at least 300 characters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <textarea
                id="task-description"
                className="min-h-32 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={taskDescription}
                onChange={(event) => setTaskDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due-at">Due at</Label>
              <Input id="task-due-at" type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} />
            </div>
            <Button
              onClick={() =>
                selectedProject &&
                createTask.mutate({
                  projectId: selectedProject,
                  title: taskTitle,
                  description: taskDescription,
                  dueAt: taskDueAt || undefined,
                })
              }
              disabled={!selectedProject || !taskTitle.trim() || taskDescription.trim().length < 300 || createTask.isPending}
            >
              Add task
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>Manage status transitions and active task selection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(taskQuery.data ?? []).map((item) => (
              <article key={item.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">{item.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {TASK_STATUS.map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={item.status === status ? "default" : "outline"}
                        onClick={() => setTaskStatus.mutate({ id: item.id, status })}
                      >
                        {status}
                      </Button>
                    ))}
                    <Button size="sm" variant={item.isActive ? "default" : "outline"} onClick={() => setActiveTask.mutate({ id: item.id })}>
                      {item.isActive ? "Active" : "Set active"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeTask.mutate({ id: item.id })}>
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Focus and schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Active task</p>
              <p className="text-muted-foreground">{dashboardQuery.data?.activeTask?.title ?? "None selected"}</p>
            </div>
            <div>
              <p className="font-medium">Upcoming</p>
              <ul className="space-y-1 text-muted-foreground">
                {(dashboardQuery.data?.upcomingTasks ?? []).map((item) => (
                  <li key={item.id}>{item.title}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium">Overdue</p>
              <ul className="space-y-1 text-muted-foreground">
                {(dashboardQuery.data?.overdueTasks ?? []).map((item) => (
                  <li key={item.id}>{item.title}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
