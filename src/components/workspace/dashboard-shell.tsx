"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownPreview } from "@/components/devlog/markdown-preview";
import { trpc } from "@/lib/trpc";

type Props = {
  initialName: string;
  initialEmail: string;
  initialUsername: string;
  initialIsProfilePublic: boolean;
};

const TASK_STATUS = ["todo", "in_progress", "stalling", "done"] as const;

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUtcDateLabel(value: string | Date) {
  return new Date(value).toUTCString();
}

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

  const devlogQuery = trpc.devlog.listByProject.useQuery(
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
  const [tomorrowPlanTaskIds, setTomorrowPlanTaskIds] = useState<string[]>([]);

  const [devlogTitle, setDevlogTitle] = useState("");
  const [devlogContent, setDevlogContent] = useState("");
  const [devlogIsPublic, setDevlogIsPublic] = useState(false);
  const [editingDevlogId, setEditingDevlogId] = useState<string | null>(null);

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
      void devlogQuery.refetch();
    },
  });

  const removeFolder = trpc.folder.remove.useMutation({
    onSuccess: () => {
      void folderQuery.refetch();
      void projectQuery.refetch();
      void taskQuery.refetch();
      void devlogQuery.refetch();
      void dashboardQuery.refetch();
    },
  });

  const removeProject = trpc.project.remove.useMutation({
    onSuccess: () => {
      void projectQuery.refetch();
      void taskQuery.refetch();
      void devlogQuery.refetch();
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

  const planTomorrow = trpc.task.planTomorrow.useMutation({
    onSuccess: () => {
      void dashboardQuery.refetch();
    },
  });

  function resetDevlogForm() {
    setEditingDevlogId(null);
    setDevlogTitle("");
    setDevlogContent("");
    setDevlogIsPublic(false);
  }

  const createDevlog = trpc.devlog.create.useMutation({
    onSuccess: () => {
      resetDevlogForm();
      void devlogQuery.refetch();
    },
  });

  const updateDevlog = trpc.devlog.update.useMutation({
    onSuccess: () => {
      resetDevlogForm();
      void devlogQuery.refetch();
    },
  });

  const removeDevlog = trpc.devlog.remove.useMutation({
    onSuccess: () => {
      void devlogQuery.refetch();
    },
  });

  const signUpload = trpc.devlog.signUpload.useMutation();
  const registerAttachment = trpc.devlog.registerAttachment.useMutation({
    onSuccess: () => {
      void devlogQuery.refetch();
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

  useEffect(() => {
    const planned = dashboardQuery.data?.plannedTomorrow.map((item) => item.taskId) ?? [];
    setTomorrowPlanTaskIds(planned);
  }, [dashboardQuery.data?.plannedTomorrow]);

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
              <p className="font-medium">Most pressing tasks</p>
              <ul className="space-y-1 text-muted-foreground">
                {(dashboardQuery.data?.pressingTasks ?? []).map((item) => (
                  <li key={item.id}>
                    {item.title}
                    {item.dueAt ? ` · ${formatUtcDateLabel(item.dueAt)}` : ""}
                  </li>
                ))}
                {dashboardQuery.data?.pressingTasks?.length ? null : <li>No dated tasks yet.</li>}
              </ul>
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

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tomorrow focus planner</CardTitle>
            <CardDescription>Choose what to tackle tomorrow. Saved as a UTC next-day plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm">
              {(dashboardQuery.data?.plannerCandidates ?? []).map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <input
                    id={`plan-${item.id}`}
                    type="checkbox"
                    className="h-4 w-4 rounded border-input text-primary"
                    checked={tomorrowPlanTaskIds.includes(item.id)}
                    onChange={(event) => {
                      setTomorrowPlanTaskIds((current) => {
                        if (event.target.checked) {
                          return [...new Set([...current, item.id])];
                        }
                        return current.filter((id) => id !== item.id);
                      });
                    }}
                  />
                  <Label htmlFor={`plan-${item.id}`} className="flex-1 text-sm">
                    {item.title}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {item.dueAt ? formatUtcDateLabel(item.dueAt) : "No due date"}
                  </span>
                </li>
              ))}
              {dashboardQuery.data?.plannerCandidates?.length ? null : (
                <li className="text-muted-foreground">No open tasks available for planning.</li>
              )}
            </ul>
            <Button
              onClick={() => planTomorrow.mutate({ taskIds: tomorrowPlanTaskIds })}
              disabled={planTomorrow.isPending}
            >
              Save tomorrow plan
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily momentum preview</CardTitle>
            <CardDescription>
              This preview mirrors the UTC morning recap email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium">Recap date</p>
              <p className="text-muted-foreground">
                {dashboardQuery.data?.dailyMomentumPreview
                  ? formatUtcDateLabel(dashboardQuery.data.dailyMomentumPreview.recapDate)
                  : "Loading..."}
              </p>
            </div>
            <div>
              <p className="font-medium">Completed yesterday</p>
              <ul className="space-y-1 text-muted-foreground">
                {(dashboardQuery.data?.dailyMomentumPreview.completedYesterday ?? []).map((item) => (
                  <li key={item.id}>{item.title}</li>
                ))}
                {dashboardQuery.data?.dailyMomentumPreview.completedYesterday?.length ? null : (
                  <li>No tasks completed yesterday.</li>
                )}
              </ul>
            </div>
            <div>
              <p className="font-medium">Planned today</p>
              <ul className="space-y-1 text-muted-foreground">
                {(dashboardQuery.data?.dailyMomentumPreview.plannedToday ?? []).map((item) => (
                  <li key={item.taskId}>
                    {item.title}
                    {item.dueAt ? ` · ${formatUtcDateLabel(item.dueAt)}` : ""}
                  </li>
                ))}
                {dashboardQuery.data?.dailyMomentumPreview.plannedToday?.length ? null : (
                  <li>No tasks planned today yet.</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{editingDevlogId ? "Edit devlog" : "Create devlog"}</CardTitle>
            <CardDescription>
              Write markdown updates for the selected project and choose whether each entry is public.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="devlog-title">Title</Label>
              <Input id="devlog-title" value={devlogTitle} onChange={(event) => setDevlogTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="devlog-content">Markdown</Label>
              <textarea
                id="devlog-content"
                className="min-h-40 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={devlogContent}
                onChange={(event) => setDevlogContent(event.target.value)}
                placeholder="## Milestone\nShipped upload signing and markdown rendering..."
              />
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-secondary/20 p-3">
              <input
                id="devlog-public"
                type="checkbox"
                className="h-4 w-4 rounded border-input text-primary"
                checked={devlogIsPublic}
                onChange={(event) => setDevlogIsPublic(event.target.checked)}
              />
              <Label htmlFor="devlog-public" className="text-sm">Expose this devlog on your public profile feed</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  if (!selectedProject) {
                    return;
                  }

                  if (editingDevlogId) {
                    updateDevlog.mutate({
                      id: editingDevlogId,
                      title: devlogTitle,
                      content: devlogContent,
                      isPublic: devlogIsPublic,
                    });
                    return;
                  }

                  createDevlog.mutate({
                    projectId: selectedProject,
                    title: devlogTitle,
                    content: devlogContent,
                    isPublic: devlogIsPublic,
                  });
                }}
                disabled={!selectedProject || !devlogTitle.trim() || !devlogContent.trim() || createDevlog.isPending || updateDevlog.isPending}
              >
                {editingDevlogId ? "Save changes" : "Publish devlog"}
              </Button>
              {editingDevlogId ? (
                <Button variant="outline" onClick={resetDevlogForm}>Cancel edit</Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Markdown preview</CardTitle>
          </CardHeader>
          <CardContent>
            {devlogContent.trim() ? (
              <MarkdownPreview content={devlogContent} className="text-sm text-foreground" />
            ) : (
              <p className="text-sm text-muted-foreground">Preview appears as you write markdown.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Project devlogs</CardTitle>
            <CardDescription>
              Latest-first timeline for the selected project with attachment uploads.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {devlogQuery.data?.length ? (
              devlogQuery.data.map((entry) => (
                <article key={entry.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-medium">{entry.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()} · {entry.isPublic ? "Public" : "Private"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingDevlogId(entry.id);
                          setDevlogTitle(entry.title);
                          setDevlogContent(entry.content);
                          setDevlogIsPublic(entry.isPublic);
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeDevlog.mutate({ id: entry.id })}>Delete</Button>
                    </div>
                  </div>

                  <MarkdownPreview content={entry.content} className="mt-3 text-sm" />

                  <div className="mt-4 space-y-2">
                    <Label htmlFor={`upload-${entry.id}`} className="text-sm">Attachments</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        id={`upload-${entry.id}`}
                        type="file"
                        className="max-w-sm"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }

                          try {
                            const signed = await signUpload.mutateAsync({
                              filename: file.name,
                              mimeType: file.type || "application/octet-stream",
                              sizeBytes: file.size,
                            });

                            const uploadResponse = await fetch(signed.uploadUrl, {
                              method: "PUT",
                              headers: {
                                "Content-Type": file.type || "application/octet-stream",
                              },
                              body: file,
                            });

                            if (!uploadResponse.ok) {
                              throw new Error("Upload to S3 failed");
                            }

                            await registerAttachment.mutateAsync({
                              devlogId: entry.id,
                              originalFilename: file.name,
                              storageKey: signed.storageKey,
                              mimeType: file.type || "application/octet-stream",
                              sizeBytes: file.size,
                              publicUrl: signed.publicUrl,
                            });
                          } catch (error) {
                            console.error(error);
                          } finally {
                            event.target.value = "";
                          }
                        }}
                      />
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {entry.attachments.map((attachment) => (
                        <li key={attachment.id}>
                          <a href={attachment.publicUrl} target="_blank" rel="noreferrer" className="underline">
                            {attachment.originalFilename}
                          </a>{" "}
                          ({formatBytes(attachment.sizeBytes)})
                        </li>
                      ))}
                      {entry.attachments.length === 0 ? <li>No attachments yet.</li> : null}
                    </ul>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No devlogs yet for this project.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
