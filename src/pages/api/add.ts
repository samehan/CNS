// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { Octokit } from "@octokit/rest";

type Data = {
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { domainname } = req.query;

  if (!domainname || typeof domainname !== "string") {
    return res.status(400).json({ message: "Domain name is required" });
  }

  try {
    const octokit = createOctokitInstance();
    const existingContent = await getExistingContent();
    const newContent = Buffer.from(
      existingContent + domainname + "\n"
    ).toString("base64");

    await octokit.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_OWNER ?? "",
      repo: process.env.GITHUB_REPO ?? "",
      path: "list.txt",
      message: `Added domain: ${domainname}`,
      content: newContent,
      sha: await getSHA(),
    });

    res.status(200).json({ message: "Domain added successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error adding domain" + error });
  }
}

function createOctokitInstance() {
  return new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
}

async function getExistingContent() {
  const octokit = createOctokitInstance();
  try {
    const response = await octokit.repos.getContent({
      owner: process.env.GITHUB_OWNER ?? "",
      repo: process.env.GITHUB_REPO ?? "",
      path: "list.txt",
    });

    if (!Array.isArray(response.data) && "content" in response.data) {
      return Buffer.from(response.data.content, "base64").toString();
    }
    return "";
  } catch (error) {
    console.log(error);
    return "";
  }
}
async function getSHA() {
  const octokit = createOctokitInstance();

  try {
    const response = await octokit.repos.getContent({
      owner: process.env.GITHUB_OWNER ?? "",
      repo: process.env.GITHUB_REPO ?? "",
      path: "list.txt",
    });

    if (!Array.isArray(response.data) && "sha" in response.data) {
      return response.data.sha;
    }

    throw new Error("File not found or unexpected response structure");
  } catch (error) {
    console.log(error);
    return "";
  }
}
