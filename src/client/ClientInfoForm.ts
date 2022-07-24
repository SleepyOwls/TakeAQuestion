class ClientInfoForm {
    private readonly usernameInput: HTMLInputElement;
    private readonly submitButton: HTMLButtonElement;
    private readonly div: HTMLDivElement;
    private readonly errorDiv: HTMLDivElement;
    private readonly errorMessage: HTMLParagraphElement;

    constructor(onSubmit: (t: string) => void) {
        this.usernameInput = document.createElement("input");
        this.submitButton = document.createElement("button");
        this.div = document.createElement("div");
        this.errorDiv = document.createElement("div");
        this.errorMessage = document.createElement("p");

        // this.div.classList.add("animate__animated", "animate__fadeInRight");

        this.usernameInput.type = "text";
        this.usernameInput.placeholder = "Nome";
        this.usernameInput.id = "username";
        this.usernameInput.autocomplete = "off";

        this.submitButton.textContent = "Entrar no jogo";
        this.submitButton.id = "submit";

        this.div.id = "joinForm";
        this.errorDiv.id = "errorDiv";
        this.errorMessage.id = "errorMsg";

        this.setup(onSubmit);

        this.errorDiv.appendChild(this.errorMessage);

        this.div.appendChild(this.usernameInput);
        this.div.appendChild(this.submitButton);
        this.div.appendChild(this.errorDiv)

        document.body.appendChild(this.div);
    }

    private setup(onSubmit: (t: string) => void) {
        this.submitButton.addEventListener("click", () => {
            let username = this.usernameInput.value || null;
            console.log(username);
            if(!username) {
                this.errorMessage.innerText = "Você deve inserir um nome para entrar na partida!";
                this.errorDiv.style.display = "block";
                setTimeout(() => { this.errorDiv.style.display = "none" }, 2000);
            } else {
                onSubmit(username);
                this.usernameInput.remove();
                this.submitButton.remove();
                this.div.remove();
            }
        });
    }
}

export { ClientInfoForm };