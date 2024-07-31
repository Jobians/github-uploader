# GitHub Uploader

This project provides a simple web interface to upload ZIP files to a specified GitHub repository. It uses Node.js, Express, and the GitHub API to facilitate the process.

## Features

- **GitHub Authorization**: Authorize with your GitHub account to access repositories.
- **File Upload**: Upload a ZIP file, which will be unzipped and its contents uploaded to a specified GitHub repository and branch.
- **Repository Creation**: Option to create a repository if it doesn't exist.
- **Custom Commit Messages**: Specify a custom commit message for the upload.

## Installation

1. **Clone the repository**:

    ```sh
    git clone https://github.com/jobians/github-uploader.git
    cd github-uploader
    ```

2. **Install dependencies**:

    ```sh
    npm install
    ```

3. **Create a `.env` file in the root directory and add your GitHub OAuth client ID and secret**:

    ```
    GITHUB_CLIENT_ID=your_client_id
    GITHUB_CLIENT_SECRET=your_client_secret
    GITHUB_REDIRECT_URI=your_redirect_uri
    GITHUB_LOCAL_REDIRECT_URI=your_local_redirect_uri
    ```

## Usage

1. **Run the server**:

    ```sh
    npm start
    ```

2. **Open your browser and go to** `http://localhost:3060`.

3. **Authorize with GitHub**.

4. **Upload your ZIP file** by specifying the branch name, repository name, and commit message. Optionally, you can choose to create the repository if it doesn't exist.

5. **The uploaded ZIP file will be unzipped and its contents will be uploaded to the specified GitHub repository**.

## Code Structure

- **`app.js`**: The main application file.
- **`public/`**: Contains the HTML and JavaScript for the front-end.
- **`uploads/`**: Temporary directory for storing uploaded files.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Contributing

Feel free to submit issues, fork the repository, and send pull requests!