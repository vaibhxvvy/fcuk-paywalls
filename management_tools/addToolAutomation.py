# A tool to quickly add a tool to the tools.json given a GitHub issue URL.
# The issue MUST have the <SUBMISSION></SUBMISSION> XML tags. The tool
# will parse the submission and auto-populate the fields required for the
# tools.json file. The tool will also send requests to GitHub to fetch
# the accurate count of stars and license info.

from datetime import date

from addTool import (
    JSON_PATH,
    getArrayInput,
    getInput,
    loadJSONFile,
    slugify,
    updateJSONFile,
)
from githubBridge import GitHubIssueBridge, GitHubRepoBridge


# Ensures that the fields contain the valid number of strings
# and the GitHub URL isn't blank.
# @param {str list} fields - A split of the insides of <SUBMISSION></SUBMISSION>
def validate(fields):
    if len(fields) != 6:
        print("Invalid number of arguments.")
        raise

    github_url = fields[4]
    if github_url == "—":
        print("Missing GitHub link / Non-FOSS.")
        raise


# Creates a tool dictionary object to be added to the tools.json
# @param {str list} fields - A split of the insides of <SUBMISSION></SUBMISSION>
# @returns {dict} tool - A dict of the new tool
def createToolDict(fields):
    repoBridge = GitHubRepoBridge(github_repo_link=fields[4])

    new_tool_json = {
        "id": slugify(fields[0]),
        "name": fields[0],
        "description": "",
        "url": fields[2],
        "category": "",
        "tags": [],
        "github": repoBridge.getURL(),
        "license": repoBridge.getLicense(),
        "stars": repoBridge.getStars(),
        "addedAt": date.today().isoformat(),
        "section": "meets-criteria",
    }

    new_tool_json["category"] = getInput("Category: ")
    new_tool_json["tags"] = getArrayInput("Tags (comma separated): ")
    new_tool_json["description"] = getInput("Description: ")

    return new_tool_json


# Prints all valid category ids
def printAllCategories(json_file_data):
    for category in json_file_data["categories"]:
        print(category["id"], end=", ")
    print()


# Entry
def main():
    userInput = getInput("Issue URL:")
    issueBridge = GitHubIssueBridge(userInput)
    fields = issueBridge.getAutomationString().split(";;")

    validate(fields)

    json_file_data = loadJSONFile()

    printAllCategories(json_file_data)

    new_tool_json = createToolDict(fields)

    # Add tool to 'JSON'.
    json_file_data["tools"].append(new_tool_json)

    print("Adding...")
    print(json_file_data["tools"][-1])

    updateJSONFile(json_file_data)


if __name__ == "__main__":
    main()
